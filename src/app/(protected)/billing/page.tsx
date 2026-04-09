'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { PLANS, SubscriptionState } from '@/lib/subscription'

type StateResp = SubscriptionState & { contactWhatsapp?: string }

export default function BillingPage() {
  const { data: session } = useSession()
  const [state, setState] = useState<StateResp | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/billing/status')
      .then((r) => r.json())
      .then((d) => setState(d))
      .finally(() => setLoading(false))
  }, [])

  const whatsapp = (state?.contactWhatsapp ?? '').replace(/\D/g, '')
  const schoolName = (session?.user as any)?.school?.name ?? 'mi escuela'
  const waUrl = (plan: string) =>
    whatsapp
      ? `https://wa.me/${whatsapp}?text=${encodeURIComponent(`Hola, quiero activar el plan ${plan} para ${schoolName}`)}`
      : '#'

  if (loading) {
    return <main className="max-w-3xl mx-auto px-4 py-8 text-sm text-warm-500">Cargando…</main>
  }

  const sub = state?.sub
  const planMeta = sub ? PLANS.find((p) => p.id === sub.plan) : null

  return (
    <main className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      <div>
        <Link href="/dashboard" className="text-sm text-warm-500 hover:text-warm-700">← Volver al dashboard</Link>
        <h1 className="text-2xl font-semibold text-warm-900 mt-2">Suscripción</h1>
      </div>

      {/* Estado actual */}
      <div className="bg-white border border-warm-200 rounded-xl p-5">
        <p className="text-xs text-warm-400 uppercase tracking-wide mb-1">Plan actual</p>
        <div className="flex items-baseline gap-3 flex-wrap">
          <h2 className="text-xl font-semibold text-warm-900">
            {sub?.plan === 'trial' ? 'Prueba gratuita' : planMeta?.name ?? 'Sin suscripción'}
          </h2>
          <StatusBadge status={sub?.status ?? 'expired'} />
        </div>
        <p className="text-sm text-warm-600 mt-2">{state?.message}</p>
        {sub?.notes && <p className="text-xs text-warm-500 mt-2 italic">{sub.notes}</p>}
      </div>

      {/* Planes disponibles */}
      <div>
        <h3 className="text-sm font-medium text-warm-700 uppercase tracking-wide mb-3">
          {sub?.status === 'trialing' ? 'Activá tu suscripción' : 'Cambiar de plan'}
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {PLANS.map((plan) => {
            const isCurrent = sub?.plan === plan.id
            return (
              <div
                key={plan.id}
                className={`bg-white rounded-xl border p-4 ${isCurrent ? 'border-brand ring-1 ring-brand/20' : 'border-warm-200'}`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-semibold text-warm-900">{plan.name}</h4>
                    <p className="text-2xl font-bold text-warm-900 mt-1">
                      USD {plan.price}
                      <span className="text-sm font-normal text-warm-500"> /mes</span>
                    </p>
                  </div>
                  {isCurrent && (
                    <span className="text-xs bg-brand/10 text-brand px-2 py-0.5 rounded-full">Actual</span>
                  )}
                </div>
                <ul className="text-xs text-warm-600 space-y-1 mt-3">
                  {plan.features.slice(0, 4).map((f) => (
                    <li key={f}>• {f}</li>
                  ))}
                </ul>
                {!isCurrent && (
                  <a
                    href={waUrl(plan.name)}
                    target="_blank"
                    rel="noreferrer"
                    className="block text-center text-sm bg-brand text-white hover:bg-brand-600 mt-4 px-3 py-2 rounded-lg"
                  >
                    Activar por WhatsApp
                  </a>
                )}
              </div>
            )
          })}
        </div>
      </div>

      <p className="text-xs text-warm-500 text-center">
        Por ahora las suscripciones se activan contactándonos por WhatsApp. Facturación en USD, mensual.
      </p>
    </main>
  )
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    trialing: 'bg-blue-100 text-blue-700',
    active: 'bg-green-100 text-green-700',
    expired: 'bg-red-100 text-red-700',
    canceled: 'bg-warm-100 text-warm-700',
  }
  const labels: Record<string, string> = {
    trialing: 'En prueba',
    active: 'Activa',
    expired: 'Vencida',
    canceled: 'Cancelada',
  }
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full ${styles[status] ?? styles.canceled}`}>
      {labels[status] ?? status}
    </span>
  )
}
