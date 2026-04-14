import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { canManageUsers } from '@/lib/permissions'

export const dynamic = 'force-dynamic'

// GET /api/users — lista usuarios de la escuela
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.school_id) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }
  if (!canManageUsers(session.user.role)) {
    return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
  }

  const { data, error } = await supabaseAdmin
    .from('users')
    .select('id, email, name, avatar_url, role, status, school_id, requested_school_name, created_at')
    .eq('school_id', session.user.school_id)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// PATCH /api/users — actualiza rol o status de un usuario
export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.school_id) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }
  if (!canManageUsers(session.user.role)) {
    return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
  }

  const { userId, role, status } = await req.json()
  if (!userId) return NextResponse.json({ error: 'userId requerido' }, { status: 400 })

  const validRoles = ['owner', 'director', 'vicedirector', 'coordinador', 'docente', 'administrativo', 'pending']
  const validStatuses = ['active', 'pending', 'rejected']
  if (role && !validRoles.includes(role)) return NextResponse.json({ error: 'Rol inválido' }, { status: 400 })
  if (status && !validStatuses.includes(status)) return NextResponse.json({ error: 'Estado inválido' }, { status: 400 })

  // Verificar que el usuario pertenece a la misma escuela
  const { data: target } = await supabaseAdmin
    .from('users')
    .select('id, school_id')
    .eq('id', userId)
    .single()

  if (!target || target.school_id !== session.user.school_id) {
    return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
  }

  const updates: Record<string, string> = {}
  if (role) updates.role = role
  if (status) updates.status = status

  const { data, error } = await supabaseAdmin
    .from('users')
    .update(updates)
    .eq('id', userId)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
