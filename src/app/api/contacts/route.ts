import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

// GET /api/contacts?q=texto  — búsqueda general
// GET /api/contacts?thread_id=uuid — contactos de un hilo específico
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.school_id) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const q = req.nextUrl.searchParams.get('q')?.trim()
  const threadId = req.nextUrl.searchParams.get('thread_id')

  // Si piden los contactos de un hilo, los devolvemos directamente via join
  if (threadId) {
    // Verify thread belongs to user's school
    const { data: thread } = await supabaseAdmin
      .from('threads').select('id').eq('id', threadId).eq('school_id', session.user.school_id).single()
    if (!thread) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

    const { data, error } = await supabaseAdmin
      .from('thread_contacts')
      .select('contact:contacts(*)')
      .eq('thread_id', threadId)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json((data ?? []).map((r: any) => r.contact).filter(Boolean))
  }

  let query = supabaseAdmin
    .from('contacts')
    .select('*')
    .eq('school_id', session.user.school_id)
    .order('name')

  if (q) query = query.ilike('name', `%${q}%`)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// POST /api/contacts — crear un contacto
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.school_id) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const body = await req.json()
  const { name, email, phone, role } = body

  if (!name?.trim()) return NextResponse.json({ error: 'El nombre es requerido' }, { status: 400 })

  const { data, error } = await supabaseAdmin
    .from('contacts')
    .insert({
      school_id: session.user.school_id,
      name: name.trim(),
      email: email?.trim() || null,
      phone: phone?.trim() || null,
      role: role?.trim() || null,
      source: 'manual',
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// DELETE /api/contacts?id=uuid
export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.school_id) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'ID requerido' }, { status: 400 })

  const { error } = await supabaseAdmin
    .from('contacts')
    .delete()
    .eq('id', id)
    .eq('school_id', session.user.school_id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
