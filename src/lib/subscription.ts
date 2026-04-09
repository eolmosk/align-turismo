import { supabaseAdmin } from './supabase'

// Re-export tipos y constantes desde el módulo compartido (client-safe)
export { PLANS, type Plan, type PlanId, type SubStatus, type Subscription, type SubscriptionState } from './subscription-shared'
import type { Subscription, SubscriptionState } from './subscription-shared'

/** Lee la suscripción de una escuela. */
export async function getSubscription(schoolId: string): Promise<Subscription | null> {
  const { data } = await supabaseAdmin
    .from('subscriptions')
    .select('*')
    .eq('school_id', schoolId)
    .single()
  return (data as any) ?? null
}

/** Deriva el estado de acceso a partir de la suscripción. */
export function deriveState(sub: Subscription | null): SubscriptionState {
  if (!sub) {
    return { sub: null, hasAccess: false, readOnly: true, daysLeft: null, message: 'Sin suscripción activa' }
  }
  const now = Date.now()
  if (sub.status === 'trialing') {
    const ends = new Date(sub.trial_ends_at).getTime()
    const daysLeft = Math.max(0, Math.ceil((ends - now) / (1000 * 60 * 60 * 24)))
    if (ends > now) {
      return { sub, hasAccess: true, readOnly: false, daysLeft, message: `Trial: ${daysLeft} ${daysLeft === 1 ? 'día' : 'días'} restantes` }
    }
    return { sub, hasAccess: false, readOnly: true, daysLeft: 0, message: 'Trial vencido' }
  }
  if (sub.status === 'active') {
    if (sub.active_until) {
      const until = new Date(sub.active_until).getTime()
      const daysLeft = Math.max(0, Math.ceil((until - now) / (1000 * 60 * 60 * 24)))
      if (until > now) {
        return { sub, hasAccess: true, readOnly: false, daysLeft, message: `Activo — renovación en ${daysLeft} ${daysLeft === 1 ? 'día' : 'días'}` }
      }
      return { sub, hasAccess: false, readOnly: true, daysLeft: 0, message: 'Suscripción vencida' }
    }
    return { sub, hasAccess: true, readOnly: false, daysLeft: null, message: 'Activo' }
  }
  if (sub.status === 'expired') {
    return { sub, hasAccess: false, readOnly: true, daysLeft: 0, message: 'Suscripción vencida' }
  }
  return { sub, hasAccess: false, readOnly: true, daysLeft: 0, message: 'Suscripción cancelada' }
}

/** Helper para endpoints que mutan datos: lanza si no hay acceso. */
export async function requireActiveSubscription(schoolId: string): Promise<{ ok: true } | { ok: false; status: number; message: string }> {
  const sub = await getSubscription(schoolId)
  const state = deriveState(sub)
  if (state.hasAccess) return { ok: true }
  return { ok: false, status: 402, message: state.message }
}

/** Crea un trial nuevo para una escuela. Idempotente. */
export async function ensureTrial(schoolId: string): Promise<void> {
  const existing = await getSubscription(schoolId)
  if (existing) return
  const trialEnds = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()
  await supabaseAdmin.from('subscriptions').insert({
    school_id: schoolId,
    plan: 'trial',
    status: 'trialing',
    trial_ends_at: trialEnds,
  })
}
