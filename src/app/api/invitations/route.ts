import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { canManageUsers } from '@/lib/permissions'
import { randomBytes } from 'crypto'

// GET /api/invitations — lista invitaciones activas de la escuela
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.school_id) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }
  if (!canManageUsers(session.user.role)) {
    return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
  }

  const { data, error } = await supabaseAdmin
    .from('invitations')
    .select('id, email, role, accepted, created_at, expires_at')
    .eq('school_id', session.user.school_id)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// POST /api/invitations — crea una invitación y devuelve el link
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id || !session.user.school_id) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }
  if (!canManageUsers(session.user.role)) {
    return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
  }

  const { email, role } = await req.json()
  if (!email || !role) {
    return NextResponse.json({ error: 'email y role son requeridos' }, { status: 400 })
  }

  const token = randomBytes(32).toString('hex')
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 días

  const { data, error } = await supabaseAdmin
    .from('invitations')
    .insert({
      school_id: session.user.school_id,
      invited_by: session.user.id,
      email,
      role,
      token,
      expires_at: expiresAt,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  const inviteUrl = `${appUrl}/onboarding?token=${token}`

  return NextResponse.json({ ...data, invite_url: inviteUrl }, { status: 201 })
}
