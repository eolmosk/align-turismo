// Tipos y constantes de suscripción — safe para client y server
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
  hasAccess: boolean
  readOnly: boolean
  daysLeft: number | null
  message: string
}
