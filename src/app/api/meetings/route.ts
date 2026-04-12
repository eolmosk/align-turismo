import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { CreateMeetingInput } from '@/types'
import { upsertMeetingEmbedding } from '@/lib/embeddings'
import { requireActiveSubscription } from '@/lib/subscription'
import { getMeetingVisibility, stripMeetingFields } from '@/lib/visibility'

// GET /api/meetings — lista reuniones de la escuela del usuario
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.school_id) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const schoolId = searchParams.get('school_id') ?? session.user.school_id
  const limit = parseInt(searchParams.get('limit') ?? '50')

  // owner puede ver otras escuelas del mismo grupo
  if (schoolId !== session.user.school_id && session.user.role !== 'owner') {
    return NextResponse.json({ error: 'Sin acceso a esta escuela' }, { status: 403 })
  }

  const userId = session.user.id
  const userRole = session.user.role

  const { data, error } = await supabaseAdmin
    .from('meetings')
    .select(`
      *,
      meeting_actions (*),
      meeting_contacts ( contact:contacts(*) )
    `)
    .eq('school_id', schoolId)
    .order('meeting_date', { ascending: false })
    .limit(limit)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Obtener reuniones donde el usuario es participante
  const meetingIds = (data ?? []).map((m: any) => m.id)
  const participantSet = new Set<string>()
  if (meetingIds.length > 0) {
    const { data: parts } = await supabaseAdmin
      .from('meeting_participants')
      .select('meeting_id')
      .eq('user_id', userId)
      .in('meeting_id', meetingIds)
    for (const p of parts ?? []) participantSet.add(p.meeting_id)
  }

  // Aplicar visibilidad
  const result = (data ?? [])
    .map((m: any) => {
      const visibility = getMeetingVisibility({
        userRole, userId, meetingUserId: m.user_id,
        isParticipant: participantSet.has(m.id),
      })
      if (visibility === 'none') return null
      return stripMeetingFields(m, visibility)
    })
    .filter(Boolean)

  return NextResponse.json(result)
}

// POST /api/meetings — crea una nueva reunión
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id || !session.user.school_id) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const body: CreateMeetingInput & { contact_ids?: string[]; topics?: string[]; participant_user_ids?: string[] } = await req.json()

  if (!body.title || !body.notes || !body.type) {
    return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 })
  }

  const access = await requireActiveSubscription(session.user.school_id)
  if (!access.ok) {
    return NextResponse.json({ error: access.message }, { status: access.status })
  }

  const { data, error } = await supabaseAdmin
    .from('meetings')
    .insert({
      school_id: session.user.school_id,
      user_id: session.user.id,
      title: body.title,
      type: body.type,
      meeting_date: body.meeting_date ?? new Date().toISOString().split('T')[0],
      next_date: body.next_date ?? null,
      next_time: body.next_time ?? null,
      next_duration: body.next_duration ?? 60,
      participants: body.participants ?? null,
      notes: body.notes,
      input_method: body.input_method ?? 'text',
      thread_id: body.thread_id ?? null,
      course: body.course ?? null,
      subject: body.subject ?? null,
      academic_year: body.academic_year ?? null,
      tags: body.tags ?? null,
      topic: body.topics ?? null,
      audio_seconds: body.audio_seconds ?? null,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Insertar creador como participante
  if (data) {
    const participantRows = [{ meeting_id: data.id, user_id: session.user.id }]
    if (body.participant_user_ids?.length) {
      for (const uid of body.participant_user_ids) {
        if (uid !== session.user.id) participantRows.push({ meeting_id: data.id, user_id: uid })
      }
    }
    await supabaseAdmin.from('meeting_participants').insert(participantRows)
  }

  // Guardar contactos asociados
  if (body.contact_ids?.length && data) {
    await supabaseAdmin.from('meeting_contacts').insert(
      body.contact_ids.map(contact_id => ({ meeting_id: data.id, contact_id }))
    )
  }

  // Actualizar last_meeting_at del hilo
  if (body.thread_id && data) {
    await supabaseAdmin
      .from('threads')
      .update({ last_meeting_at: new Date().toISOString() })
      .eq('id', body.thread_id)
  }

  // Generar embedding para búsqueda semántica (fire-and-forget, no bloquea)
  if (data?.id) {
    upsertMeetingEmbedding(data.id).catch(() => { /* logged inside */ })
  }

  return NextResponse.json(data, { status: 201 })
}
