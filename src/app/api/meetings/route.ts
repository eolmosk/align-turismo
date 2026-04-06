import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { CreateMeetingInput } from '@/types'

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
  return NextResponse.json(data)
}

// POST /api/meetings — crea una nueva reunión
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id || !session.user.school_id) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const body: CreateMeetingInput & { contact_ids?: string[]; topic?: string } = await req.json()

  if (!body.title || !body.notes || !body.type) {
    return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 })
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
      topic: body.topic ?? null,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

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

  return NextResponse.json(data, { status: 201 })
}
