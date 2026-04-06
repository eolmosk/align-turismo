import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

// GET /api/threads — lista hilos de la escuela con stats
// GET /api/threads?archived=true — lista hilos archivados
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.school_id) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const showArchived = req.nextUrl.searchParams.get('archived') === 'true'

  const { data: threads, error } = await supabaseAdmin
    .from('threads')
    .select(`
      *,
      meetings (
        id, meeting_date, created_at, ai_questions,
        meeting_actions ( id, text, done )
      ),
      thread_contacts ( contact:contacts ( id, name ) )
    `)
    .eq('school_id', session.user.school_id)
    .eq('archived', showArchived)
    .order('last_meeting_at', { ascending: false, nullsFirst: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Agregar stats útiles a cada hilo
  const enriched = (threads ?? []).map((t) => {
    const meetings = t.meetings ?? []
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

  return NextResponse.json(enriched)
}

// POST /api/threads — crea un nuevo hilo
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id || !session.user.school_id) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { name, type, participants, description, course, subject, academic_year, tags, topic, contact_ids } = await req.json()

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
      topic: topic ?? null,
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
