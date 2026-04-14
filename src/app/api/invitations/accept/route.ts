import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

// POST /api/invitations/accept — acepta una invitación por token
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { token } = await req.json()
  if (!token) return NextResponse.json({ error: 'Token requerido' }, { status: 400 })

  // Buscar la invitación
  const { data: invitation, error: invErr } = await supabaseAdmin
    .from('invitations')
    .select('*')
    .eq('token', token)
    .single()

  if (invErr || !invitation) {
    return NextResponse.json({ error: 'Invitación no encontrada' }, { status: 404 })
  }
  if (invitation.accepted) {
    return NextResponse.json({ error: 'Esta invitación ya fue usada' }, { status: 400 })
  }
  if (new Date(invitation.expires_at) < new Date()) {
    return NextResponse.json({ error: 'La invitación expiró' }, { status: 400 })
  }

  // Asignar escuela + rol al usuario y marcarlo activo
  const { error: userErr } = await supabaseAdmin
    .from('users')
    .update({
      school_id: invitation.school_id,
      role: invitation.role,
      status: 'active',
      onboarded: true,
    })
    .eq('id', session.user.id)

  if (userErr) return NextResponse.json({ error: userErr.message }, { status: 500 })

  // Registrar membresía en user_schools
  await supabaseAdmin.from('user_schools').upsert({
    user_id: session.user.id,
    school_id: invitation.school_id,
    role: invitation.role,
  }, { onConflict: 'user_id,school_id' })

  // Marcar invitación como aceptada
  await supabaseAdmin
    .from('invitations')
    .update({ accepted: true })
    .eq('id', invitation.id)

  return NextResponse.json({ ok: true, role: invitation.role })
}
