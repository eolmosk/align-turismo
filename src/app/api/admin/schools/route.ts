import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

function isAdmin(role: string | undefined) {
  return role === 'owner'
}

// GET /api/admin/schools — listar todas las escuelas
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!isAdmin(session?.user?.role)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  const { data, error } = await supabaseAdmin
    .from('schools')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// POST /api/admin/schools — crear escuela
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!isAdmin(session?.user?.role)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  const { name, group_name, logo_url, color_primary, color_secondary, color_accent } = await req.json()
  if (!name?.trim()) return NextResponse.json({ error: 'Nombre requerido' }, { status: 400 })

  const { data, error } = await supabaseAdmin
    .from('schools')
    .insert({
      name: name.trim(),
      group_name: group_name?.trim() || null,
      logo_url: logo_url?.trim() || null,
      color_primary: color_primary || '#CD4700',
      color_secondary: color_secondary || '#7C7066',
      color_accent: color_accent || '#E05A00',
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Dar acceso al owner automáticamente
  if (session?.user?.id) {
    await supabaseAdmin.from('user_schools').upsert({
      user_id: session.user.id,
      school_id: data.id,
      role: 'owner',
    }, { onConflict: 'user_id,school_id' })
  }

  return NextResponse.json(data, { status: 201 })
}

// PATCH /api/admin/schools — actualizar escuela
export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!isAdmin(session?.user?.role)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  const { id, ...updates } = await req.json()
  if (!id) return NextResponse.json({ error: 'id requerido' }, { status: 400 })

  const allowed = ['name', 'group_name', 'logo_url', 'color_primary', 'color_secondary', 'color_accent']
  const clean: Record<string, any> = {}
  for (const key of allowed) {
    if (updates[key] !== undefined) clean[key] = updates[key]
  }

  const { data, error } = await supabaseAdmin
    .from('schools')
    .update(clean)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// DELETE /api/admin/schools — eliminar escuela
export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!isAdmin(session?.user?.role)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  const { id } = await req.json()
  if (!id) return NextResponse.json({ error: 'id requerido' }, { status: 400 })

  // Desasociar usuarios que tienen esta escuela como activa
  await supabaseAdmin
    .from('users')
    .update({ school_id: null })
    .eq('school_id', id)

  // Eliminar membresías
  await supabaseAdmin.from('user_schools').delete().eq('school_id', id)

  // Eliminar la escuela
  const { error } = await supabaseAdmin.from('schools').delete().eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return new NextResponse(null, { status: 204 })
}
