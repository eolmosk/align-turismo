import { supabaseAdmin } from './supabase'

export type PlanId = 'trial' | 'solo' | 'institucional' | 'grupo_5' | 'grupo_10'
export type SubStatus = 'trialing' | 'active' | 'expired' | 'canceled'

export interface Plan {
  id: Exclude<PlanId, 'trial'>
  name: string
  price: number            // USD mensual
  maxUsers: number | null  // null = ilimitado
  maxSchools: number
  whisperHours: number
  features: string[]
}

export const PLANS: Plan[] = [
  {
    id: 'solo',
    name: 'Solo',
    price: 19,
    maxUsers: 1,
    maxSchools: 1,
    whisperHours: 3,
    features: [
      '1 escuela',
      '1 usuario',
      '30 reuniones por mes',
      '3 horas de transcripción Whisper',
      'IA (resumen, acciones, preguntas)',
      'Buscador conversacional',
    ],
  },
  {
    id: 'institucional',
    name: 'Institucional',
    price: 99,
    maxUsers: 10,
    maxSchools: 1,
    whisperHours: 15,
    features: [
      '1 escuela',
      'Hasta 10 usuarios',
      'Reuniones ilimitadas',
      '15 horas de transcripción Whisper',
      'IA completa',
      'Buscador conversacional',
      'Digest semanal',
    ],
  },
  {
    id: 'grupo_5',
    name: 'Grupo 5',
    price: 399,
    maxUsers: 10,
    maxSchools: 5,
    whisperHours: 50,
    features: [
      'Hasta 5 escuelas',
      'Hasta 10 usuarios por escuela',
      'Panel multi-escuela',
      '50 horas de Whisper (total)',
      'Todo lo del plan Institucional',
    ],
  },
  {
    id: 'grupo_10',
    name: 'Grupo 10',
    price: 749,
    maxUsers: 10,
    maxSchools: 10,
    whisperHours: 100,
    features: [
      'Hasta 10 escuelas',
      'Hasta 10 usuarios por escuela',
      'Panel multi-escuela',
      '100 horas de Whisper (total)',
      'Soporte prioritario',
    ],
  },
]

export interface Subscription {
  id: string
  school_id: string
  plan: PlanId
  status: SubStatus
  trial_ends_at: string
  active_until: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface SubscriptionState {
  sub: Subscription | null
  hasAccess: boolean       // puede leer y mutar
  readOnly: boolean        // trial vencido: puede leer pero no mutar
  daysLeft: number | null  // días restantes del trial o del periodo activo
  message: string
}

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
