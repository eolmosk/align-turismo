import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

const ADMIN_USER_ID = '757692ca-333e-469d-a9eb-d370db452cde'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (session?.user?.id !== ADMIN_USER_ID) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  const today = new Date().toISOString().split('T')[0]

  // Todas las queries en paralelo
  const [usersRes, membershipsRes, meetingsRes, actionsRes] = await Promise.all([
    supabaseAdmin
      .from('users')
      .select('id, email, name, role, status, created_at')
      .order('created_at', { ascending: false }),
    supabaseAdmin
      .from('user_schools')
      .select('user_id, role, schools:school_id ( name )'),
    supabaseAdmin
      .from('meetings')
      .select('id, user_id, input_method, ai_questions, next_date'),
    supabaseAdmin
      .from('meeting_actions')
      .select('id, done, meetings!inner( user_id )')
      .eq('done', false),
  ])

  if (usersRes.error) return NextResponse.json({ error: usersRes.error.message }, { status: 500 })

  const users = usersRes.data ?? []
  const memberships = membershipsRes.data ?? []
  const meetings = meetingsRes.data ?? []
  const pendingActions = actionsRes.data ?? []

  // Membresías por usuario
  const schoolsByUser = new Map<string, Array<{ school_name: string; role: string }>>()
  for (const m of memberships) {
    const list = schoolsByUser.get(m.user_id) ?? []
    list.push({ school_name: (m as any).schools?.name ?? '?', role: m.role })
    schoolsByUser.set(m.user_id, list)
  }

  // Métricas por usuario desde meetings
  const meetingsByUser = new Map<string, number>()
  const whisperByUser = new Map<string, number>()
  const aiByUser = new Map<string, number>()
  const scheduledByUser = new Map<string, number>()

  for (const m of meetings) {
    const uid = m.user_id
    if (!uid) continue
    meetingsByUser.set(uid, (meetingsByUser.get(uid) ?? 0) + 1)
    if (m.input_method === 'audio' || m.input_method === 'voice') {
      whisperByUser.set(uid, (whisperByUser.get(uid) ?? 0) + 1)
    }
    if (m.ai_questions) {
      aiByUser.set(uid, (aiByUser.get(uid) ?? 0) + 1)
    }
    if (m.next_date && m.next_date >= today) {
      scheduledByUser.set(uid, (scheduledByUser.get(uid) ?? 0) + 1)
    }
  }

  // Pendientes por usuario (vía meetings.user_id)
  const pendingByUser = new Map<string, number>()
  for (const a of pendingActions) {
    const uid = (a as any).meetings?.user_id
    if (!uid) continue
    pendingByUser.set(uid, (pendingByUser.get(uid) ?? 0) + 1)
  }

  // Armar respuesta
  const enrichedUsers = users.map(u => ({
    id: u.id,
    email: u.email,
    name: u.name,
    role: u.role,
    status: u.status,
    created_at: u.created_at,
    schools: schoolsByUser.get(u.id) ?? [],
    meetingsCreated: meetingsByUser.get(u.id) ?? 0,
    pendingActions: pendingByUser.get(u.id) ?? 0,
    scheduledMeetings: scheduledByUser.get(u.id) ?? 0,
    whisperUsage: whisperByUser.get(u.id) ?? 0,
    aiUsage: aiByUser.get(u.id) ?? 0,
  }))

  const global = {
    totalUsers: users.length,
    totalMeetings: meetings.length,
    totalPendingActions: pendingActions.length,
    totalScheduled: meetings.filter(m => m.next_date && m.next_date >= today).length,
    totalWhisper: meetings.filter(m => m.input_method === 'audio' || m.input_method === 'voice').length,
    totalAI: meetings.filter(m => m.ai_questions).length,
  }

  return NextResponse.json({ global, users: enrichedUsers })
}
