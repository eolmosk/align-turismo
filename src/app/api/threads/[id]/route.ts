import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

// GET /api/threads/[id] — detalle del hilo con historial completo
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.school_id) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { data: thread, error } = await supabaseAdmin
    .from('threads')
    .select('*')
    .eq('id', params.id)
    .eq('school_id', session.user.school_id)
    .single()

  if (error || !thread) return NextResponse.json({ error: 'Hilo no encontrado' }, { status: 404 })

  // Traer todas las reuniones del hilo ordenadas por fecha
  const { data: meetings } = await supabaseAdmin
    .from('meetings')
    .select('*, meeting_actions(*), meeting_contacts(contact:contacts(id, name, role))')
    .eq('thread_id', params.id)
    .order('meeting_date', { ascending: false })

  const allMeetings = meetings ?? []
  const lastMeeting = allMeetings[0] ?? null

  // Acciones: todas (hechas + pendientes) con contexto de reunión
  const allActions = allMeetings.flatMap((m) =>
    ((m.meeting_actions ?? []) as any[]).map((a: any) => ({
      ...a,
      meeting_title: m.title,
      meeting_date: m.meeting_date,
    }))
  )
  const pendingActions = allActions.filter((a) => !a.done)

  // Preguntas de la última reunión
  const openQuestions = lastMeeting?.ai_questions ?? []

  return NextResponse.json({
    thread,
    meetings: allMeetings,
    lastMeeting,
    pendingActions,
    allActions,
    openQuestions,
  })
}

// PATCH /api/threads/[id] — actualizar o archivar hilo
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.school_id) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const body = await req.json()
  const { contact_ids, school_id, user_id, id, created_at, ...threadFields } = body

  const { data, error } = await supabaseAdmin
    .from('threads')
    .update(threadFields)
    .eq('id', params.id)
    .eq('school_id', session.user.school_id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Actualizar contactos si se enviaron
  if (Array.isArray(contact_ids)) {
    await supabaseAdmin.from('thread_contacts').delete().eq('thread_id', params.id)
    if (contact_ids.length > 0) {
      await supabaseAdmin.from('thread_contacts').insert(
        contact_ids.map((contact_id: string) => ({ thread_id: params.id, contact_id }))
      )
    }
  }

  return NextResponse.json(data)
}
