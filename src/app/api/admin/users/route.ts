import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

const ADMIN_USER_ID = '757692ca-333e-469d-a9eb-d370db452cde'

function isAdmin(userId: string | undefined) {
  return userId === ADMIN_USER_ID
}

// GET /api/admin/users — listar todos los usuarios con sus escuelas
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!isAdmin(session?.user?.id)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  const { data: users, error } = await supabaseAdmin
    .from('users')
    .select('id, email, name, role, status, school_id, onboarded, created_at')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Traer membresías
  const { data: memberships } = await supabaseAdmin
    .from('user_schools')
    .select('user_id, school_id, role, schools:school_id ( name )')

  const userMap = new Map<string, any[]>()
  for (const m of memberships ?? []) {
    const list = userMap.get(m.user_id) ?? []
    list.push({ school_id: m.school_id, school_name: (m as any).schools?.name, role: m.role })
    userMap.set(m.user_id, list)
  }

  const enriched = (users ?? []).map(u => ({
    ...u,
    schools: userMap.get(u.id) ?? [],
  }))

  return NextResponse.json(enriched)
}

// POST /api/admin/users — asignar usuario a escuela
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!isAdmin(session?.user?.id)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  const { user_id, school_id, role } = await req.json()
  if (!user_id || !school_id) {
    return NextResponse.json({ error: 'user_id y school_id requeridos' }, { status: 400 })
  }

  const { error } = await supabaseAdmin.from('user_schools').upsert({
    user_id,
    school_id,
    role: role || 'docente',
  }, { onConflict: 'user_id,school_id' })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Si el usuario no tiene escuela activa, asignarle esta
  const { data: user } = await supabaseAdmin
    .from('users')
    .select('school_id')
    .eq('id', user_id)
    .single()

  if (!user?.school_id) {
    await supabaseAdmin
      .from('users')
      .update({ school_id, role: role || 'docente', status: 'active', onboarded: true })
      .eq('id', user_id)
  }

  return NextResponse.json({ ok: true })
}
