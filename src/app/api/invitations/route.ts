import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { canManageUsers } from '@/lib/permissions'
import { getSubscription } from '@/lib/subscription'
import { PLANS } from '@/lib/subscription-shared'
import { randomBytes } from 'crypto'
import { Resend } from 'resend'

export const dynamic = 'force-dynamic'

const ADMIN_EMAIL = 'eolmosk@gmail.com'

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

// POST /api/invitations — crea una invitación, envía email al invitado y notifica al admin
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id || !session.user.school_id) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  // 1. Verificar que el invitador tiene permisos (owner, director, vicedirector)
  if (!canManageUsers(session.user.role)) {
    return NextResponse.json({ error: 'No tenés permisos para invitar usuarios' }, { status: 403 })
  }

  const { email, role } = await req.json()
  if (!email || !role) {
    return NextResponse.json({ error: 'email y role son requeridos' }, { status: 400 })
  }

  const schoolId = session.user.school_id

  // 2. Verificar si ya existe un usuario activo con ese email en esta escuela
  const { data: existingUser } = await supabaseAdmin
    .from('user_schools')
    .select('user_id, users!inner(email)')
    .eq('school_id', schoolId)
    .eq('users.email', email)
    .maybeSingle()

  if (existingUser) {
    return NextResponse.json({ error: 'Este email ya tiene acceso a la escuela' }, { status: 409 })
  }

  // 3. Verificar si ya hay una invitación pendiente para este email
  const { data: existingInvite } = await supabaseAdmin
    .from('invitations')
    .select('id')
    .eq('school_id', schoolId)
    .eq('email', email)
    .eq('accepted', false)
    .maybeSingle()

  if (existingInvite) {
    return NextResponse.json({ error: 'Ya existe una invitación pendiente para este email' }, { status: 409 })
  }

  // 4. Verificar límite de usuarios del plan
  const sub = await getSubscription(schoolId)
  const plan = sub ? PLANS.find(p => p.id === sub.plan) : null
  const maxUsers = plan?.maxUsers ?? 1  // trial = 1 usuario por defecto

  // Contar usuarios actuales en la escuela
  const { count: userCount } = await supabaseAdmin
    .from('user_schools')
    .select('*', { count: 'exact', head: true })
    .eq('school_id', schoolId)

  // Contar invitaciones pendientes (no aceptadas)
  const { count: pendingCount } = await supabaseAdmin
    .from('invitations')
    .select('*', { count: 'exact', head: true })
    .eq('school_id', schoolId)
    .eq('accepted', false)

  const totalProjected = (userCount ?? 0) + (pendingCount ?? 0) + 1
  if (maxUsers !== null && totalProjected > maxUsers) {
    return NextResponse.json({
      error: `Tu plan ${plan?.name ?? 'actual'} permite hasta ${maxUsers} usuario${maxUsers !== 1 ? 's' : ''}. Actualmente tenés ${userCount ?? 0} usuario${(userCount ?? 0) !== 1 ? 's' : ''} y ${pendingCount ?? 0} invitación${(pendingCount ?? 0) !== 1 ? 'es' : ''} pendiente${(pendingCount ?? 0) !== 1 ? 's' : ''}. Actualizá tu plan para agregar más.`,
    }, { status: 402 })
  }

  // 5. Crear la invitación
  const token = randomBytes(32).toString('hex')
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()

  const { data, error } = await supabaseAdmin
    .from('invitations')
    .insert({
      school_id: schoolId,
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

  // 6. Enviar email al invitado
  const resendKey = process.env.RESEND_API_KEY
  const fromEmail = process.env.RESEND_FROM_EMAIL ?? 'onboarding@resend.dev'
  const schoolName = session.user.school?.name ?? 'una escuela'
  const inviterName = session.user.name ?? session.user.email ?? 'Un miembro del equipo'

  if (resendKey) {
    const resend = new Resend(resendKey)

    // Email al invitado
    try {
      await resend.emails.send({
        from: fromEmail,
        to: email,
        subject: `${inviterName} te invitó a ${schoolName} en Align`,
        html: buildInviteEmail({ inviterName, schoolName, role, inviteUrl }),
      })
    } catch (e: any) {
      console.error('invitations: error sending invite email', e?.message)
    }

    // Email de notificación al admin de Align
    try {
      await resend.emails.send({
        from: fromEmail,
        to: ADMIN_EMAIL,
        subject: `[Align] Nueva invitación: ${email} → ${schoolName}`,
        html: buildAdminNotifyEmail({ email, role, schoolName, inviterName, inviterEmail: session.user.email ?? '' }),
      })
    } catch (e: any) {
      console.error('invitations: error sending admin notification', e?.message)
    }
  }

  return NextResponse.json({ ...data, invite_url: inviteUrl }, { status: 201 })
}

// ─── Templates de email ─────────────────────────────────────────────

function buildInviteEmail(p: { inviterName: string; schoolName: string; role: string; inviteUrl: string }): string {
  return `
<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 520px; margin: 0 auto; padding: 40px 20px; color: #1a1a1a;">
  <div style="text-align: center; margin-bottom: 32px;">
    <h1 style="font-size: 20px; font-weight: 600; margin: 0;">Align</h1>
  </div>
  <p style="font-size: 15px; line-height: 1.6;">
    <strong>${p.inviterName}</strong> te invitó a unirte a <strong>${p.schoolName}</strong> en Align como <strong>${p.role}</strong>.
  </p>
  <p style="font-size: 15px; line-height: 1.6;">
    Align es una plataforma para gestionar reuniones escolares, hacer seguimiento de acuerdos y mantener la continuidad con ayuda de IA.
  </p>
  <div style="text-align: center; margin: 32px 0;">
    <a href="${p.inviteUrl}" style="display: inline-block; background: #e11d48; color: white; text-decoration: none; padding: 14px 32px; border-radius: 10px; font-size: 15px; font-weight: 600;">
      Aceptar invitación
    </a>
  </div>
  <p style="font-size: 13px; color: #666; line-height: 1.5;">
    Este link es válido por 7 días. Si no esperabas esta invitación, podés ignorar este correo.
  </p>
  <hr style="border: none; border-top: 1px solid #eee; margin: 32px 0;">
  <p style="font-size: 11px; color: #999; text-align: center;">
    Align por FrameOps · align.frameops.net
  </p>
</body></html>`
}

function buildAdminNotifyEmail(p: { email: string; role: string; schoolName: string; inviterName: string; inviterEmail: string }): string {
  return `
<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 520px; margin: 0 auto; padding: 40px 20px; color: #1a1a1a;">
  <h2 style="font-size: 16px; margin: 0 0 16px;">Nueva invitación en Align</h2>
  <table style="font-size: 14px; line-height: 1.8; border-collapse: collapse;">
    <tr><td style="padding-right: 16px; color: #666;">Invitado:</td><td><strong>${p.email}</strong></td></tr>
    <tr><td style="padding-right: 16px; color: #666;">Rol:</td><td>${p.role}</td></tr>
    <tr><td style="padding-right: 16px; color: #666;">Escuela:</td><td>${p.schoolName}</td></tr>
    <tr><td style="padding-right: 16px; color: #666;">Invitado por:</td><td>${p.inviterName} (${p.inviterEmail})</td></tr>
  </table>
  <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;">
  <p style="font-size: 11px; color: #999;">Notificación automática de Align</p>
</body></html>`
}
