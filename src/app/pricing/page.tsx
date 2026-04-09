import Link from 'next/link'
import { PLANS } from '@/lib/subscription'

export const metadata = {
  title: 'Planes — Align',
  description: 'Planes y precios de Align para escuelas.',
}

export default function PricingPage() {
  const whatsapp = process.env.CONTACT_WHATSAPP ?? ''
  const waUrl = (plan: string) =>
    whatsapp
      ? `https://wa.me/${whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(`Hola, quiero información del plan ${plan} de Align`)}`
      : '#'

  return (
    <main className="min-h-screen bg-warm-50 py-12 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-10">
          <Link href="/" className="text-sm text-warm-500 hover:text-warm-700">← Volver</Link>
          <h1 className="text-3xl sm:text-4xl font-semibold text-warm-900 mt-4">Planes de Align</h1>
          <p className="text-warm-600 mt-2">Probá 14 días gratis, sin tarjeta. Cancelá cuando quieras.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {PLANS.map((plan) => {
            const highlight = plan.id === 'institucional'
            return (
              <div
                key={plan.id}
                className={`bg-white rounded-xl border p-5 flex flex-col ${highlight ? 'border-brand ring-2 ring-brand/20' : 'border-warm-200'}`}
              >
                {highlight && (
                  <span className="text-xs font-medium text-brand uppercase tracking-wide mb-2">Más elegido</span>
                )}
                <h2 className="text-lg font-semibold text-warm-900">{plan.name}</h2>
                <div className="mt-3 mb-4">
                  <span className="text-3xl font-bold text-warm-900">USD {plan.price}</span>
                  <span className="text-sm text-warm-500"> / mes</span>
                </div>
                <ul className="text-sm text-warm-700 space-y-2 mb-5 flex-1">
                  {plan.features.map((f) => (
                    <li key={f} className="flex gap-2">
                      <span className="text-brand">✓</span>
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <a
                  href={waUrl(plan.name)}
                  target="_blank"
                  rel="noreferrer"
                  className={`text-center text-sm font-medium px-4 py-2.5 rounded-lg transition-colors ${
                    highlight
                      ? 'bg-brand text-white hover:bg-brand-600'
                      : 'border border-warm-300 text-warm-700 hover:bg-warm-50'
                  }`}
                >
                  Contactar
                </a>
              </div>
            )
          })}
        </div>

        <p className="text-center text-xs text-warm-500 mt-8">
          ¿Dudas? Escribinos por{' '}
          {whatsapp ? (
            <a href={`https://wa.me/${whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noreferrer" className="underline">WhatsApp</a>
          ) : 'WhatsApp'}
          . Cobramos en USD, facturación mensual.
        </p>
      </div>
    </main>
  )
}
