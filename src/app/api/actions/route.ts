import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { getMeetingVisibility } from '@/lib/visibility'

// GET /api/actions?filter=all|mine|unassigned (default: all)
// Pendientes de la escuela, agrupados por hilo, con info de assignee.
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.school_id || !session.user.id) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const filter = (req.nextUrl.searchParams.get('filter') ?? 'all') as 'all' | 'mine' | 'unassigned'
  const myUserId = session.user.id
  const userRole = session.user.role

  const { data: meetings, error } = await supabaseAdmin
    .from('meetings')
    .select(`
      id, title, meeting_date, thread_id, user_id,
      thread:threads(id, name, type),
      meeting_actions(
        id, text, done, created_at,
        assigned_to, assigned_user_id, assigned_contact_id,
        assigned_user:users!assigned_user_id(id, name, email),
        assigned_contact:contacts!assigned_contact_id(id, name)
      )
    `)
    .eq('school_id', session.user.school_id)
    .order('meeting_date', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Obtener participaciones del usuario
  const meetingIds = (meetings ?? []).map((m: any) => m.id)
  const participantSet = new Set<string>()
  if (meetingIds.length > 0) {
    const { data: parts } = await supabaseAdmin
      .from('meeting_participants')
      .select('meeting_id')
      .eq('user_id', myUserId)
      .in('meeting_id', meetingIds)
    for (const p of parts ?? []) participantSet.add(p.meeting_id)
  }

  const pendingByThread: Record<string, any> = {}
  const counts = { all: 0, mine: 0, unassigned: 0 }

  for (const meeting of meetings ?? []) {
    const thread = (meeting as any).thread
    if (!thread) continue

    const vis = getMeetingVisibility({
      userRole, userId: myUserId, meetingUserId: (meeting as any).user_id,
      isParticipant: participantSet.has((meeting as any).id),
    })

    const acts = ((meeting as any).meeting_actions ?? []).filter((a: any) => !a.done)

    for (const a of acts) {
      const isMine = a.assigned_user_id === myUserId
      const isUnassigned = !a.assigned_user_id && !a.assigned_contact_id && !a.assigned_to

      // "mine" siempre muestra acciones asignadas al usuario, sin importar visibilidad
      // Para "all" y "unassigned", respetar visibilidad de la reunión
      if (filter !== 'mine' && vis === 'none') continue
      if (filter === 'mine' && !isMine) continue

      counts.all++
      if (isMine) counts.mine++
      if (isUnassigned) counts.unassigned++

      // Aplicar filtro
      if (filter === 'unassigned' && !isUnassigned) continue

      if (!pendingByThread[thread.id]) {
        pendingByThread[thread.id] = { thread, actions: [] }
      }
      pendingByThread[thread.id].actions.push({
        id: a.id,
        text: a.text,
        assigned_to: a.assigned_to ?? null,
        assigned_user_id: a.assigned_user_id ?? null,
        assigned_contact_id: a.assigned_contact_id ?? null,
        assigned_user: a.assigned_user ?? null,
        assigned_contact: a.assigned_contact ?? null,
        isMine,
        isUnassigned,
        meeting_id: (meeting as any).id,
        meeting_title: (meeting as any).title,
        meeting_date: (meeting as any).meeting_date,
      })
    }
  }

  const groups = Object.values(pendingByThread).sort(
    (a: any, b: any) => b.actions.length - a.actions.length
  )

  return NextResponse.json({ groups, counts })
}
