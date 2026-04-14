import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

// POST /api/schools/switch — cambiar la escuela activa del usuario
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { school_id } = await req.json()
  if (!school_id) return NextResponse.json({ error: 'school_id requerido' }, { status: 400 })

  // Verificar que el usuario tiene membresía en esa escuela
  const { data: membership } = await supabaseAdmin
    .from('user_schools')
    .select('role')
    .eq('user_id', session.user.id)
    .eq('school_id', school_id)
    .single()

  if (!membership) {
    return NextResponse.json({ error: 'No tenés acceso a esta escuela' }, { status: 403 })
  }

  // Actualizar escuela activa y rol correspondiente
  const { error } = await supabaseAdmin
    .from('users')
    .update({ school_id, role: membership.role })
    .eq('id', session.user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true, school_id, role: membership.role })
}
