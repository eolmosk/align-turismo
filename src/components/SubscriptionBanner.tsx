'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import type { SubscriptionState } from '@/lib/subscription-shared'

/**
 * Banner superior en el dashboard que avisa:
 *  - Trial con pocos días restantes (<= 3)
 *  - Trial vencido / suscripción expirada (modo solo lectura)
 *  - Suscripción activa por vencer (<= 5 días)
 * Oculto si está todo OK.
 */
export default function SubscriptionBanner() {
  const [state, setState] = useState<SubscriptionState | null>(null)

  useEffect(() => {
    fetch('/api/billing/status').then((r) => r.json()).then(setState).catch(() => {})
  }, [])

  if (!state || !state.sub) return null

  const { sub, hasAccess, daysLeft } = state

  // No mostrar nada si está activo y con margen
  if (hasAccess && (daysLeft === null || daysLeft > 5)) return null
  if (hasAccess && sub.status === 'trialing' && (daysLeft ?? 99) > 3) return null

  const isBlocked = !hasAccess
  const bg = isBlocked ? 'bg-red-50 border-red-200 text-red-800' : 'bg-amber-50 border-amber-200 text-amber-800'

  let text = ''
  if (isBlocked) {
    text = sub.status === 'trialing' || sub.status === 'expired' ? 'Tu prueba gratuita venció.' : 'Tu suscripción no está activa.'
    text += ' Podés seguir viendo las reuniones existentes, pero no crear nuevas hasta activar un plan.'
  } else if (sub.status === 'trialing') {
    text = `Quedan ${daysLeft} ${daysLeft === 1 ? 'día' : 'días'} de prueba gratuita.`
  } else {
    text = `Tu suscripción vence en ${daysLeft} ${daysLeft === 1 ? 'día' : 'días'}.`
  }

  return (
    <div className={`border-b ${bg} px-4 sm:px-6 py-2`}>
      <div className="max-w-4xl mx-auto flex flex-wrap items-center justify-between gap-2 text-sm">
        <span>{text}</span>
        <Link href="/billing" className="font-medium underline underline-offset-2">
          Ver planes
        </Link>
      </div>
    </div>
  )
}
