import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { PLANS } from '@/lib/subscription-shared'

const ADMIN_USER_ID = '757692ca-333e-469d-a9eb-d370db452cde'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (session?.user?.id !== ADMIN_USER_ID) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  const today = new Date().toISOString().split('T')[0]

  // Todas las queries en paralelo
  const [usersRes, membershipsRes, meetingsRes, actionsRes, subsRes] = await Promise.all([
    supabaseAdmin
      .from('users')
      .select('id, email, name, role, status, school_id, created_at')
      .order('created_at', { ascending: false }),
    supabaseAdmin
      .from('user_schools')
      .select('user_id, school_id, role, schools:school_id ( name )'),
    supabaseAdmin
      .from('meetings')
      .select('id, user_id, school_id, input_method, ai_questions, next_date'),
    supabaseAdmin
      .from('meeting_actions')
      .select('id, done, meetings!inner( user_id )')
      .eq('done', false),
    supabaseAdmin
      .from('subscriptions')
      .select('school_id, plan, status, trial_ends_at, active_until'),
  ])

  if (usersRes.error) return NextResponse.json({ error: usersRes.error.message }, { status: 500 })

  const users = usersRes.data ?? []
  const memberships = membershipsRes.data ?? []
  const meetings = meetingsRes.data ?? []
  const pendingActions = actionsRes.data ?? []
  const subscriptions = subsRes.data ?? []

  // Suscripciones por escuela
  const subBySchool = new Map<string, any>()
  for (const s of subscriptions) {
    subBySchool.set(s.school_id, s)
  }

  // Plan limits por escuela
  const planBySchool = new Map<string, any>()
  for (const s of subscriptions) {
    const planDef = PLANS.find(p => p.id === s.plan)
    if (planDef) planBySchool.set(s.school_id, planDef)
  }

  // Whisper y AI usage por escuela
  const whisperBySchool = new Map<string, number>()
  const aiBySchool = new Map<string, number>()
  for (const m of meetings) {
    const sid = m.school_id
    if (!sid) continue
    if (m.input_method === 'audio' || m.input_method === 'voice') {
      whisperBySchool.set(sid, (whisperBySchool.get(sid) ?? 0) + 1)
    }
    if (m.ai_questions) {
      aiBySchool.set(sid, (aiBySchool.get(sid) ?? 0) + 1)
    }
  }

  // Membresías por usuario (con school_id para linkear suscripción)
  const schoolsByUser = new Map<string, Array<{ school_id: string; school_name: string; role: string }>>()
  for (const m of memberships) {
    const list = schoolsByUser.get(m.user_id) ?? []
    list.push({ school_id: m.school_id, school_name: (m as any).schools?.name ?? '?', role: m.role })
    schoolsByUser.set(m.user_id, list)
  }

  // Armar info de escuelas para la respuesta
  const schoolsData: Record<string, any> = {}
  for (const s of subscriptions) {
    const plan = PLANS.find(p => p.id === s.plan)
    const endDate = s.status === 'trialing' ? s.trial_ends_at : s.active_until
    const daysLeft = endDate ? Math.ceil((new Date(endDate).getTime() - Date.now()) / 86400000) : null
    schoolsData[s.school_id] = {
      plan: s.plan,
      status: s.status,
      daysLeft,
      whisperLimit: plan?.whisperHours ?? 0,
      whisperUsed: whisperBySchool.get(s.school_id) ?? 0,
      aiUsed: aiBySchool.get(s.school_id) ?? 0,
    }
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
  const enrichedUsers = users.map(u => {
    const userSchools = schoolsByUser.get(u.id) ?? []
    // Tomar la suscripción de la escuela activa del usuario
    const primarySchoolId = u.school_id ?? userSchools[0]?.school_id
    const sub = primarySchoolId ? schoolsData[primarySchoolId] : null
    return {
      id: u.id,
      email: u.email,
      name: u.name,
      role: u.role,
      status: u.status,
      created_at: u.created_at,
      schools: userSchools,
      meetingsCreated: meetingsByUser.get(u.id) ?? 0,
      pendingActions: pendingByUser.get(u.id) ?? 0,
      scheduledMeetings: scheduledByUser.get(u.id) ?? 0,
      whisperUsage: whisperByUser.get(u.id) ?? 0,
      aiUsage: aiByUser.get(u.id) ?? 0,
      subscription: sub,
    }
  })

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
