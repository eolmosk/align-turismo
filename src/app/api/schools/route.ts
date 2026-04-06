import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

// GET /api/schools — lista las escuelas a las que pertenece el usuario
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { data, error } = await supabaseAdmin
    .from('user_schools')
    .select('school_id, role, schools:school_id ( id, name, group_name, logo_url, color_primary )')
    .eq('user_id', session.user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const schools = (data ?? []).map((row: any) => ({
    id: row.schools.id,
    name: row.schools.name,
    group_name: row.schools.group_name,
    logo_url: row.schools.logo_url,
    color_primary: row.schools.color_primary,
    role: row.role,
    active: row.school_id === session.user.school_id,
  }))

  return NextResponse.json(schools)
}
