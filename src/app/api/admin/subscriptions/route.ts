import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

const OWNER_GLOBAL_ID = '757692ca-333e-469d-a9eb-d370db452cde'

function isAdmin(session: any): boolean {
  return session?.user?.id === OWNER_GLOBAL_ID
}

// GET /api/admin/subscriptions — lista todas las escuelas + su suscripción
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!isAdmin(session)) return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })

  const { data, error } = await supabaseAdmin
    .from('schools')
    .select('id, name, group_name, created_at, subscriptions(*)')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// PATCH /api/admin/subscriptions — body: { school_id, plan?, status?, active_until?, notes? }
export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!isAdmin(session)) return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })

  const body = await req.json()
  const { school_id, plan, status, active_until, notes, trial_ends_at } = body
  if (!school_id) return NextResponse.json({ error: 'Falta school_id' }, { status: 400 })

  const update: any = { updated_at: new Date().toISOString() }
  if (plan !== undefined) update.plan = plan
  if (status !== undefined) update.status = status
  if (active_until !== undefined) update.active_until = active_until
  if (trial_ends_at !== undefined) update.trial_ends_at = trial_ends_at
  if (notes !== undefined) update.notes = notes

  // Upsert por si la escuela no tiene fila aún
  const existing = await supabaseAdmin.from('subscriptions').select('id').eq('school_id', school_id).maybeSingle()

  if (existing.data) {
    const { data, error } = await supabaseAdmin
      .from('subscriptions')
      .update(update)
      .eq('school_id', school_id)
      .select()
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
  } else {
    const { data, error } = await supabaseAdmin
      .from('subscriptions')
      .insert({
        school_id,
        plan: plan ?? 'trial',
        status: status ?? 'trialing',
        trial_ends_at: trial_ends_at ?? new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
        active_until: active_until ?? null,
        notes: notes ?? null,
      })
      .select()
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
  }
}
