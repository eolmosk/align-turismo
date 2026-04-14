import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { getMeetingVisibility } from '@/lib/visibility'

export const dynamic = 'force-dynamic'

// GET /api/threads — lista hilos de la escuela con stats
// GET /api/threads?archived=true — lista hilos archivados
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.school_id) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const showArchived = req.nextUrl.searchParams.get('archived') === 'true'
  const userId = session.user.id
  const userRole = session.user.role

  const { data: threads, error } = await supabaseAdmin
    .from('threads')
    .select(`
      *,
      meetings (
        id, user_id, meeting_date, created_at, ai_questions,
        meeting_actions ( id, text, done )
      ),
      thread_contacts ( contact:contacts ( id, name ) )
    `)
    .eq('school_id', session.user.school_id)
    .eq('archived', showArchived)
    .order('last_meeting_at', { ascending: false, nullsFirst: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Obtener todas las reuniones donde el usuario es participante
  const allMeetingIds = (threads ?? []).flatMap((t: any) => (t.meetings ?? []).map((m: any) => m.id))
  const participantSet = new Set<string>()
  if (allMeetingIds.length > 0) {
    const { data: parts } = await supabaseAdmin
      .from('meeting_participants')
      .select('meeting_id')
      .eq('user_id', userId)
      .in('meeting_id', allMeetingIds)
    for (const p of parts ?? []) participantSet.add(p.meeting_id)
  }

  // Agregar stats útiles a cada hilo, filtrando reuniones por visibilidad
  const enriched = (threads ?? []).map((t) => {
    const allMeetings = t.meetings ?? []

    // Filtrar reuniones visibles para este usuario
    const meetings = allMeetings.filter((m: any) => {
      const vis = getMeetingVisibility({
        userRole, userId, meetingUserId: m.user_id,
        isParticipant: participantSet.has(m.id),
      })
      return vis !== 'none'
    })

    const allActions = meetings.flatMap((m: any) => m.meeting_actions ?? [])
    const pendingActions = allActions.filter((a: any) => !a.done).length
    const lastMeeting = meetings.sort((a: any, b: any) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )[0]

    const contactNames = (t.thread_contacts ?? [])
      .map((tc: any) => tc.contact?.name)
      .filter(Boolean) as string[]

    return {
      ...t,
      meetings: undefined,
      thread_contacts: undefined,
      meetingCount: meetings.length,
      pendingActions,
      lastMeetingDate: lastMeeting?.meeting_date ?? null,
      hasAI: meetings.some((m: any) => m.ai_questions),
      contactNames,
    }
  })

  // Para coordinador/docente, ocultar hilos sin reuniones visibles
  const LEADERSHIP = ['owner', 'director', 'vicedirector']
  const filtered = LEADERSHIP.includes(userRole)
    ? enriched
    : enriched.filter((t: any) => t.meetingCount > 0)

  return NextResponse.json(filtered)
}

// POST /api/threads — crea un nuevo hilo
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id || !session.user.school_id) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { name, type, participants, description, course, subject, academic_year, tags, topics, contact_ids } = await req.json()

  if (!name?.trim() || !type) {
    return NextResponse.json({ error: 'Nombre y tipo son requeridos' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from('threads')
    .insert({
      school_id: session.user.school_id,
      user_id: session.user.id,
      name: name.trim(),
      type,
      participants: participants?.trim() || null,
      description: description?.trim() || null,
      course: course?.trim() || null,
      subject: subject?.trim() || null,
      academic_year: academic_year ?? null,
      tags: tags ?? null,
      topics: topics ?? null,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Guardar contactos asociados
  if (Array.isArray(contact_ids) && contact_ids.length > 0 && data) {
    await supabaseAdmin.from('thread_contacts').insert(
      contact_ids.map((contact_id: string) => ({ thread_id: data.id, contact_id }))
    )
  }

  return NextResponse.json(data, { status: 201 })
}
