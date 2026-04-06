import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
import { supabaseAdmin } from '@/lib/supabase'
import { buildReminderEmail } from '@/lib/email/reminder'
import { Resend } from 'resend'

// GET /api/cron/reminders
// Vercel Cron Job — corre todos los días a las 8am (America/Montevideo)
// Configurado en vercel.json
export async function GET(req: NextRequest) {
  const resend = new Resend(process.env.RESEND_API_KEY)
  // Verificar que la llamada viene de Vercel Cron o de nosotros
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const today = new Date().toISOString().split('T')[0]
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

  // Buscar todas las reuniones programadas para hoy (next_date = hoy)
  const { data: meetings, error } = await supabaseAdmin
    .from('meetings')
    .select(`
      id, title, next_date, next_time, thread_id,
      ai_questions, ai_commitments, ai_summary,
      threads (id, name, type, participants),
      meeting_actions (id, text, done)
    `)
    .eq('next_date', today)
    .not('thread_id', 'is', null)

  if (error) {
    console.error('Cron error fetching meetings:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!meetings?.length) {
    return NextResponse.json({ sent: 0, message: 'No hay reuniones para hoy' })
  }

  let sent = 0
  const errors: string[] = []

  for (const meeting of meetings) {
    const thread = meeting.threads as any
    if (!thread) continue

    // Buscar el director de esta escuela para obtener su email
    const { data: user } = await supabaseAdmin
      .from('users')
      .select('email, name')
      .eq('id', (meeting as any).user_id)
      .single()

    if (!user?.email) continue

    // Construir el email
    const pendingActions = ((meeting.meeting_actions as any[]) ?? []).filter((a) => !a.done)

    const { subject, html } = buildReminderEmail({
      directorName: user.name ?? '',
      threadName: thread.name,
      threadType: thread.type,
      meetingDate: meeting.next_date!,
      meetingTime: meeting.next_time ?? undefined,
      threadUrl: `${appUrl}/thread/${thread.id}`,
      aiSummary: meeting.ai_summary,
      aiQuestions: meeting.ai_questions,
      pendingActions,
      commitments: meeting.ai_commitments,
    })

    try {
      await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL ?? 'onboarding@resend.dev',
        to: user.email,
        subject,
        html,
      })
      sent++
      console.log(`Reminder sent to ${user.email} for thread ${thread.name}`)
    } catch (e: any) {
      console.error(`Error sending to ${user.email}:`, e.message)
      errors.push(user.email)
    }
  }

  return NextResponse.json({
    sent,
    total: meetings.length,
    errors: errors.length ? errors : undefined,
  })
}
