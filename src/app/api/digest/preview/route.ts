import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { Resend } from 'resend'
import { buildDigestData, buildDigestEmail } from '@/lib/email/weekly-digest'

export const dynamic = 'force-dynamic'

/**
 * GET /api/digest/preview
 *   → devuelve el HTML del digest en el browser (para verlo visualmente)
 *
 * GET /api/digest/preview?send=1
 *   → además, lo manda al email del usuario logueado
 */
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id || !session.user.email) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? new URL(req.url).origin
  const data = await buildDigestData(session.user.id, appUrl)
  if (!data) {
    return NextResponse.json({ error: 'No hay datos disponibles para este usuario' }, { status: 404 })
  }

  const { subject, html } = buildDigestEmail(data)

  const send = new URL(req.url).searchParams.get('send')
  if (send === '1') {
    try {
      const resend = new Resend(process.env.RESEND_API_KEY)
      await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL ?? 'onboarding@resend.dev',
        to: session.user.email,
        subject,
        html,
      })
      return NextResponse.json({ ok: true, sentTo: session.user.email, subject })
    } catch (e: any) {
      return NextResponse.json({ error: e?.message ?? 'Error enviando email' }, { status: 500 })
    }
  }

  // Por defecto: devolver HTML para verlo en el browser
  return new NextResponse(html, {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  })
}
