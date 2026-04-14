'use client'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import Link from 'next/link'
import SchoolLogo from '@/components/SchoolLogo'

interface StatsData {
  totalMeetings: number
  byMonth: { month: string; count: number }[]
  byType: Record<string, number>
  topParticipants: { name: string; count: number }[]
  topWords: { word: string; count: number }[]
}

export default function StatsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [stats, setStats] = useState<StatsData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/auth')
  }, [status, router])

  useEffect(() => {
    if (!session) return
    fetch('/api/stats')
      .then(r => r.json())
      .then(data => { setStats(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [session])

  if (status === 'loading' || loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-warm-200 border-t-brand rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="min-h-screen bg-white">
      <header className="bg-white border-b border-warm-100 px-4 sm:px-6 py-3 sm:py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="text-warm-400 hover:text-warm-600 transition-colors">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <SchoolLogo size={32} />
            <h1 className="text-base font-medium text-warm-900">Estadísticas</h1>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {!stats ? (
          <div className="text-center py-24 text-sm text-warm-400">No se pudieron cargar las estadísticas.</div>
        ) : stats.totalMeetings === 0 ? (
          <div className="bg-white rounded-xl border border-warm-200 p-12 text-center">
            <p className="text-sm font-medium text-warm-900 mb-1">Todavía no hay reuniones registradas</p>
            <p className="text-sm text-warm-500">Las estadísticas aparecerán cuando empieces a registrar reuniones.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Totales */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
              {[
                { label: 'Total reuniones', value: stats.totalMeetings },
                { label: 'Equipo / Turno', value: stats.byType['equipo'] ?? 0 },
                { label: 'Proveedor', value: stats.byType['proveedor'] ?? 0 },
                { label: 'Cliente', value: stats.byType['cliente'] ?? 0 },
                { label: 'Gerencia', value: stats.byType['gerencia'] ?? 0 },
              ].map(s => (
                <div key={s.label} className="bg-white rounded-xl border border-warm-200 p-4">
                  <p className="text-xs text-warm-500 mb-1">{s.label}</p>
                  <p className="text-2xl font-medium text-warm-900">{s.value}</p>
                </div>
              ))}
            </div>

            {/* Gráfico por mes */}
            {stats.byMonth.length > 0 && (
              <div className="bg-white rounded-xl border border-warm-200 p-5">
                <h3 className="text-sm font-medium text-warm-900 mb-4">Reuniones por mes</h3>
                <div className="flex items-end gap-2 h-32">
                  {stats.byMonth.map(({ month, count }) => {
                    const maxMonth = Math.max(...stats.byMonth.map(m => m.count), 1)
                    const heightPct = Math.round((count / maxMonth) * 100)
                    const [year, m] = month.split('-')
                    const label = format(new Date(Number(year), Number(m) - 1), 'MMM', { locale: es })
                    return (
                      <div key={month} className="flex-1 flex flex-col items-center gap-1">
                        <span className="text-xs text-warm-500">{count}</span>
                        <div className="w-full bg-brand rounded-t-sm" style={{ height: `${heightPct}%`, minHeight: '4px' }} />
                        <span className="text-xs text-warm-400 capitalize">{label}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Participantes frecuentes */}
              <div className="bg-white rounded-xl border border-warm-200 p-5">
                <h3 className="text-sm font-medium text-warm-900 mb-3">Participantes frecuentes</h3>
                {stats.topParticipants.length > 0 ? (
                  <div className="space-y-2">
                    {stats.topParticipants.slice(0, 8).map(({ name, count }) => (
                      <div key={name} className="flex items-center justify-between">
                        <span className="text-sm text-warm-700 truncate flex-1 mr-2">{name}</span>
                        <span className="text-xs text-warm-400 flex-shrink-0">{count} reunión{count > 1 ? 'es' : ''}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-warm-400">Agregá participantes a tus reuniones para ver quiénes participan más.</p>
                )}
              </div>

              {/* Palabras frecuentes */}
              <div className="bg-white rounded-xl border border-warm-200 p-5">
                <h3 className="text-sm font-medium text-warm-900 mb-3">Palabras más frecuentes</h3>
                {stats.topWords.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {stats.topWords.slice(0, 20).map(({ word, count }) => {
                      const size = count > 10 ? 'text-base font-medium' : count > 5 ? 'text-sm' : 'text-xs'
                      return (
                        <span key={word} className={`${size} text-warm-700 bg-warm-100 px-2 py-0.5 rounded`}>
                          {word}
                        </span>
                      )
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-warm-400">Las palabras clave aparecerán cuando las reuniones tengan notas o resúmenes de IA.</p>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
