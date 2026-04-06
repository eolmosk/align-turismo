import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { buildReminderEmail } from '@/lib/email/reminder'
import { Resend } from 'resend'

// POST /api/email/send — envía el recordatorio manualmente para un hilo
export async function POST(req: NextRequest) {
  const resend = new Resend(process.env.RESEND_API_KEY)
  const session = await getServerSession(authOptions)
  if (!session?.user?.id || !session?.user?.school_id || !session.user.email) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { threadId } = await req.json()
  if (!threadId) return NextResponse.json({ error: 'threadId requerido' }, { status: 400 })

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

  // Traer el hilo con su última reunión
  const { data: thread } = await supabaseAdmin
    .from('threads')
    .select('*')
    .eq('id', threadId)
    .eq('school_id', session.user.school_id)
    .single()

  if (!thread) return NextResponse.json({ error: 'Hilo no encontrado' }, { status: 404 })

  // Última reunión del hilo
  const { data: meetings } = await supabaseAdmin
    .from('meetings')
    .select('*, meeting_actions(*)')
    .eq('thread_id', threadId)
    .order('created_at', { ascending: false })
    .limit(1)

  const lastMeeting = meetings?.[0] ?? null
  const pendingActions = lastMeeting
    ? ((lastMeeting.meeting_actions as any[]) ?? []).filter((a) => !a.done)
    : []

  const { subject, html } = buildReminderEmail({
    directorName: session.user.name ?? '',
    threadName: thread.name,
    threadType: thread.type,
    meetingDate: new Date().toISOString().split('T')[0],
    meetingTime: lastMeeting?.next_time ?? undefined,
    threadUrl: `${appUrl}/thread/${threadId}`,
    aiSummary: lastMeeting?.ai_summary,
    aiQuestions: lastMeeting?.ai_questions,
    pendingActions,
    commitments: lastMeeting?.ai_commitments,
  })

  try {
    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL ?? 'onboarding@resend.dev',
      to: session.user.email,
      subject,
      html,
    })
    return NextResponse.json({ success: true })
  } catch (e: any) {
    console.error('Error sending email:', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
