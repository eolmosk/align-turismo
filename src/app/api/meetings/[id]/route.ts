import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { upsertMeetingEmbedding } from '@/lib/embeddings'

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
  return NextResponse.json(data)
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.school_id) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

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
  const body = await req.json()

  // Separar contact_ids del resto del body
  const { contact_ids, school_id, user_id, id, created_at, ...meetingFields } = body

  const { data, error } = await supabaseAdmin
    .from('meetings').update(meetingFields).eq('id', params.id).eq('school_id', session.user.school_id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

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
