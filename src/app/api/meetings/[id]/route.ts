import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { upsertMeetingEmbedding } from '@/lib/embeddings'
import { getMeetingVisibility, stripMeetingFields } from '@/lib/visibility'

async function isParticipant(meetingId: string, userId: string): Promise<boolean> {
  const { data } = await supabaseAdmin
    .from('meeting_participants')
    .select('meeting_id')
    .eq('meeting_id', meetingId)
    .eq('user_id', userId)
    .maybeSingle()
  return !!data
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.school_id) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { data, error } = await supabaseAdmin
    .from('meetings')
    .select('*, meeting_actions(*), meeting_contacts(contact:contacts(*))')
    .eq('id', params.id)
    .eq('school_id', session.user.school_id)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 404 })

  const participates = await isParticipant(params.id, session.user.id)
  const visibility = getMeetingVisibility({
    userRole: session.user.role,
    userId: session.user.id,
    meetingUserId: data.user_id,
    isParticipant: participates,
  })

  if (visibility === 'none') return NextResponse.json({ error: 'Sin acceso' }, { status: 403 })
  return NextResponse.json(stripMeetingFields(data, visibility))
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.school_id) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  // Solo el creador o owner/director pueden eliminar
  const { data: meeting } = await supabaseAdmin
    .from('meetings')
    .select('user_id')
    .eq('id', params.id)
    .eq('school_id', session.user.school_id)
    .single()

  if (!meeting) return NextResponse.json({ error: 'No encontrada' }, { status: 404 })

  const participates = await isParticipant(params.id, session.user.id)
  const visibility = getMeetingVisibility({
    userRole: session.user.role,
    userId: session.user.id,
    meetingUserId: meeting.user_id,
    isParticipant: participates,
  })

  if (visibility !== 'full') return NextResponse.json({ error: 'Sin permisos para eliminar' }, { status: 403 })

  const { error } = await supabaseAdmin
    .from('meetings')
    .delete()
    .eq('id', params.id)
    .eq('school_id', session.user.school_id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return new NextResponse(null, { status: 204 })
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.school_id) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  // Verificar visibilidad full antes de permitir edición
  const { data: existing } = await supabaseAdmin
    .from('meetings')
    .select('user_id')
    .eq('id', params.id)
    .eq('school_id', session.user.school_id)
    .single()

  if (!existing) return NextResponse.json({ error: 'No encontrada' }, { status: 404 })

  const participates = await isParticipant(params.id, session.user.id)
  const visibility = getMeetingVisibility({
    userRole: session.user.role,
    userId: session.user.id,
    meetingUserId: existing.user_id,
    isParticipant: participates,
  })

  if (visibility !== 'full') return NextResponse.json({ error: 'Sin permisos para editar' }, { status: 403 })

  const body = await req.json()
  const { contact_ids, participant_user_ids, school_id, user_id, id, created_at, topics, ...meetingFields } = body
  if (topics !== undefined) meetingFields.topic = topics

  const { data, error } = await supabaseAdmin
    .from('meetings').update(meetingFields).eq('id', params.id).eq('school_id', session.user.school_id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Actualizar participantes del sistema si se enviaron
  if (Array.isArray(participant_user_ids)) {
    await supabaseAdmin.from('meeting_participants').delete().eq('meeting_id', params.id)
    const rows = [{ meeting_id: params.id, user_id: session.user.id }]
    for (const uid of participant_user_ids) {
      if (uid !== session.user.id) rows.push({ meeting_id: params.id, user_id: uid })
    }
    await supabaseAdmin.from('meeting_participants').insert(rows)
  }

  // Actualizar contactos si se enviaron
  if (Array.isArray(contact_ids)) {
    await supabaseAdmin.from('meeting_contacts').delete().eq('meeting_id', params.id)
    if (contact_ids.length > 0) {
      await supabaseAdmin.from('meeting_contacts').insert(
        contact_ids.map((contact_id: string) => ({ meeting_id: params.id, contact_id }))
      )
    }
  }

  // Refrescar embedding si cambió contenido relevante
  const contentFields = ['title', 'notes', 'ai_summary', 'ai_questions', 'ai_commitments', 'participants', 'type']
  if (contentFields.some((f) => f in meetingFields)) {
    upsertMeetingEmbedding(params.id).catch(() => { /* logged inside */ })
  }

  return NextResponse.json(data)
}
