import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { supabaseAdmin } from '@/lib/supabase'
import { buildDigestData, buildDigestEmail } from '@/lib/email/weekly-digest'

export const dynamic = 'force-dynamic'

// GET /api/cron/weekly-digest
// Vercel Cron — corre los lunes a las 8am Montevideo (= 11:00 UTC)
// Configurado en vercel.json
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const resend = new Resend(process.env.RESEND_API_KEY)
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  const fromEmail = process.env.RESEND_FROM_EMAIL ?? 'onboarding@resend.dev'

  // Traer todos los usuarios con email y escuela activa
  const { data: users, error } = await supabaseAdmin
    .from('users')
    .select('id, email, name')
    .not('email', 'is', null)
    .not('school_id', 'is', null)

  if (error) {
    console.error('weekly-digest cron error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  let sent = 0
  let skipped = 0
  const errors: string[] = []

  for (const user of users ?? []) {
    try {
      const data = await buildDigestData(user.id, appUrl)
      if (!data) { skipped++; continue }

      // Si no hay nada que reportar, no spamear
      const hasContent = data.totals.upcoming + data.totals.pending + data.totals.unprocessed > 0
      if (!hasContent) { skipped++; continue }

      const { subject, html } = buildDigestEmail(data)
      await resend.emails.send({ from: fromEmail, to: user.email, subject, html })
      sent++
    } catch (e: any) {
      console.error(`weekly-digest error for ${user.email}:`, e?.message)
      errors.push(user.email)
    }
  }

  return NextResponse.json({
    sent,
    skipped,
    total: users?.length ?? 0,
    errors: errors.length ? errors : undefined,
  })
}
