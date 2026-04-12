'use client'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'

const ADMIN_USER_ID = '757692ca-333e-469d-a9eb-d370db452cde'

interface GlobalStats {
  totalUsers: number
  totalMeetings: number
  totalPendingActions: number
  totalScheduled: number
  totalWhisper: number
  totalAI: number
}

interface SubscriptionInfo {
  plan: string
  status: string
  daysLeft: number | null
  whisperLimit: number
  whisperUsed: number
  aiUsed: number
}

interface UserAnalytics {
  id: string
  email: string
  name: string | null
  role: string
  status: string
  created_at: string
  schools: Array<{ school_id: string; school_name: string; role: string }>
  meetingsCreated: number
  pendingActions: number
  scheduledMeetings: number
  whisperUsage: number
  aiUsage: number
  subscription: SubscriptionInfo | null
}

type SortKey = 'name' | 'meetingsCreated' | 'pendingActions' | 'scheduledMeetings' | 'whisperUsage' | 'aiUsage'

export default function AdminAnalytics() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [global, setGlobal] = useState<GlobalStats | null>(null)
  const [users, setUsers] = useState<UserAnalytics[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState<SortKey>('meetingsCreated')
  const [sortAsc, setSortAsc] = useState(false)

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/auth')
    if (status === 'authenticated' && session?.user?.id !== ADMIN_USER_ID) router.push('/dashboard')
  }, [status, session, router])

  useEffect(() => {
    if (!session || session.user?.id !== ADMIN_USER_ID) return
    fetch('/api/admin/analytics')
      .then(r => r.json())
      .then(data => {
        setGlobal(data.global)
        setUsers(data.users ?? [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [session])

  const handleSort = (key: SortKey) => {
    if (sortBy === key) { setSortAsc(!sortAsc) } else { setSortBy(key); setSortAsc(false) }
  }

  const filtered = useMemo(() => {
    let list = users
    if (search) {
      const q = search.toLowerCase()
      list = list.filter(u =>
        (u.name ?? '').toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.schools.some(s => s.school_name.toLowerCase().includes(q))
      )
    }
    list = [...list].sort((a, b) => {
      const av = sortBy === 'name' ? (a.name ?? a.email).toLowerCase() : a[sortBy]
      const bv = sortBy === 'name' ? (b.name ?? b.email).toLowerCase() : b[sortBy]
      if (av < bv) return sortAsc ? -1 : 1
      if (av > bv) return sortAsc ? 1 : -1
      return 0
    })
    return list
  }, [users, search, sortBy, sortAsc])

  // Agrupar escuelas únicas para gauges
  const schoolGauges = useMemo(() => {
    const seen = new Map<string, { name: string; sub: SubscriptionInfo }>()
    for (const u of users) {
      if (!u.subscription) continue
      for (const s of u.schools) {
        if (!seen.has(s.school_id)) {
          seen.set(s.school_id, { name: s.school_name, sub: u.subscription })
        }
      }
    }
    return Array.from(seen.values())
  }, [users])

  if (status === 'loading' || loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-warm-200 border-t-brand rounded-full animate-spin" />
    </div>
  )

  const statCards = global ? [
    { label: 'Usuarios', value: global.totalUsers, color: 'text-brand' },
    { label: 'Reuniones', value: global.totalMeetings, color: 'text-warm-700' },
    { label: 'Pendientes', value: global.totalPendingActions, color: 'text-amber-600' },
    { label: 'Agendadas', value: global.totalScheduled, color: 'text-green-600' },
    { label: 'Whisper', value: global.totalWhisper, color: 'text-purple-600' },
    { label: 'IA procesadas', value: global.totalAI, color: 'text-brand-600' },
  ] : []

  const columns: Array<{ key: SortKey; label: string }> = [
    { key: 'name', label: 'Usuario' },
    { key: 'meetingsCreated', label: 'Reuniones' },
    { key: 'pendingActions', label: 'Pendientes' },
    { key: 'scheduledMeetings', label: 'Agendadas' },
    { key: 'whisperUsage', label: 'Whisper' },
    { key: 'aiUsage', label: 'IA' },
  ]

  return (
    <div className="min-h-screen bg-warm-50">
      {/* Header */}
      <header className="bg-white border-b border-warm-100 px-4 sm:px-6 py-3 sm:py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link href="/admin" className="text-warm-400 hover:text-warm-600 transition-colors">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <div>
              <h1 className="text-base font-medium text-warm-900">Analítica de uso</h1>
              <p className="text-xs text-warm-500">Uso de la plataforma por usuario y escuela</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/admin" className="text-xs text-warm-500 hover:text-warm-700 px-3 py-1.5 border border-warm-200 rounded-lg">Admin</Link>
            <Link href="/admin/subscriptions" className="text-xs text-warm-500 hover:text-warm-700 px-3 py-1.5 border border-warm-200 rounded-lg">Suscripciones</Link>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-8">
        {/* Global stats */}
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
          {statCards.map(card => (
            <div key={card.label} className="bg-white rounded-xl border border-warm-200 p-4 text-center">
              <p className={`text-2xl font-bold ${card.color}`}>{card.value}</p>
              <p className="text-xs text-warm-500 mt-1">{card.label}</p>
            </div>
          ))}
        </div>

        {/* Gauges por escuela */}
        {schoolGauges.length > 0 && (
          <section>
            <h2 className="text-sm font-medium text-warm-900 mb-4">Uso por escuela</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {schoolGauges.map((sg, i) => (
                <div key={i} className="bg-white rounded-xl border border-warm-200 p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-medium text-warm-900 truncate">{sg.name}</h3>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      sg.sub.status === 'active' ? 'bg-green-50 text-green-700 border border-green-200' :
                      sg.sub.status === 'trialing' ? 'bg-brand-50 text-brand-700 border border-brand-200' :
                      'bg-warm-100 text-warm-600 border border-warm-200'
                    }`}>
                      {sg.sub.plan}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    {/* Gauge Whisper */}
                    <div className="flex flex-col items-center">
                      <Gauge
                        value={sg.sub.whisperUsed}
                        max={sg.sub.whisperLimit || 1}
                        color={sg.sub.whisperUsed / (sg.sub.whisperLimit || 1) > 0.8 ? '#dc2626' : '#7c3aed'}
                        label="Whisper"
                      />
                      <p className="text-xs text-warm-500 mt-1">{sg.sub.whisperUsed}/{sg.sub.whisperLimit}h</p>
                    </div>

                    {/* Gauge IA */}
                    <div className="flex flex-col items-center">
                      <Gauge
                        value={sg.sub.aiUsed}
                        max={Math.max(sg.sub.aiUsed, 50)}
                        color="#2563eb"
                        label="IA"
                      />
                      <p className="text-xs text-warm-500 mt-1">{sg.sub.aiUsed} proc.</p>
                    </div>

                    {/* Gauge Suscripción */}
                    <div className="flex flex-col items-center">
                      <Gauge
                        value={Math.max(sg.sub.daysLeft ?? 0, 0)}
                        max={sg.sub.status === 'trialing' ? 14 : 30}
                        color={
                          (sg.sub.daysLeft ?? 0) <= 3 ? '#dc2626' :
                          (sg.sub.daysLeft ?? 0) <= 7 ? '#f59e0b' :
                          '#16a34a'
                        }
                        label="Días"
                      />
                      <p className={`text-xs mt-1 ${
                        (sg.sub.daysLeft ?? 0) <= 3 ? 'text-red-600 font-medium' :
                        (sg.sub.daysLeft ?? 0) <= 7 ? 'text-amber-600' :
                        'text-warm-500'
                      }`}>
                        {sg.sub.daysLeft !== null
                          ? sg.sub.daysLeft <= 0 ? 'Vencido' : `${sg.sub.daysLeft}d restantes`
                          : 'Sin fecha'}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Search + Table */}
        <section>
          <div className="flex items-center justify-between gap-3 mb-4">
            <h2 className="text-sm font-medium text-warm-900">Detalle por usuario</h2>
            <input
              type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Buscar..."
              className="text-sm bg-white border border-warm-200 rounded-xl px-4 py-2 w-full sm:max-w-xs"
            />
          </div>

          <div className="bg-white rounded-xl border border-warm-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-warm-100 bg-warm-50/50">
                    {columns.map(col => (
                      <th key={col.key}
                        onClick={() => handleSort(col.key)}
                        className={`px-4 py-3 text-xs font-medium text-warm-500 uppercase tracking-wide cursor-pointer hover:text-warm-700 select-none whitespace-nowrap ${
                          col.key === 'name' ? 'text-left' : 'text-center'
                        }`}>
                        <span className="inline-flex items-center gap-1">
                          {col.label}
                          {sortBy === col.key && (
                            <svg className={`w-3 h-3 transition-transform ${sortAsc ? '' : 'rotate-180'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                            </svg>
                          )}
                        </span>
                      </th>
                    ))}
                    <th className="px-4 py-3 text-xs font-medium text-warm-500 uppercase tracking-wide text-center">Sub</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-warm-50">
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-10 text-center text-sm text-warm-400">
                        {search ? `Sin resultados para "${search}"` : 'No hay usuarios'}
                      </td>
                    </tr>
                  ) : (
                    filtered.map(u => {
                      const total = u.meetingsCreated + u.whisperUsage + u.aiUsage
                      const isActive = total > 0
                      const sub = u.subscription
                      return (
                        <tr key={u.id} className={`hover:bg-warm-50/50 transition-colors ${!isActive ? 'opacity-40' : ''}`}>
                          <td className="px-4 py-3">
                            <p className="text-sm font-medium text-warm-900">{u.name ?? u.email}</p>
                            {u.name && <p className="text-xs text-warm-400">{u.email}</p>}
                            <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                              {u.schools.map((s, i) => (
                                <span key={i} className="text-xs bg-warm-100 text-warm-600 px-1.5 py-0.5 rounded">
                                  {s.school_name}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <MetricBadge value={u.meetingsCreated} />
                          </td>
                          <td className="px-4 py-3 text-center">
                            <MetricBadge value={u.pendingActions} warn={u.pendingActions > 10} />
                          </td>
                          <td className="px-4 py-3 text-center">
                            <MetricBadge value={u.scheduledMeetings} good={u.scheduledMeetings > 0} />
                          </td>
                          <td className="px-4 py-3 text-center">
                            <MetricBadge value={u.whisperUsage} />
                          </td>
                          <td className="px-4 py-3 text-center">
                            <MetricBadge value={u.aiUsage} />
                          </td>
                          <td className="px-4 py-3 text-center">
                            {sub ? (
                              <SubBadge status={sub.status} daysLeft={sub.daysLeft} plan={sub.plan} />
                            ) : (
                              <span className="text-xs text-warm-300">—</span>
                            )}
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <p className="text-xs text-warm-400 mt-3">
            Whisper = reuniones con audio transcrito. IA = reuniones procesadas con preguntas de seguimiento. Sub = días restantes de suscripción.
          </p>
        </section>
      </main>
    </div>
  )
}

// ─── Gauge SVG (semicircular) ─────────────────────────────────────────────────

function Gauge({ value, max, color, label }: { value: number; max: number; color: string; label: string }) {
  const pct = Math.min(value / max, 1)
  const radius = 36
  const stroke = 6
  const circumference = Math.PI * radius // semicircle
  const offset = circumference * (1 - pct)

  return (
    <div className="relative w-20 h-12">
      <svg viewBox="0 0 80 48" className="w-full h-full">
        {/* Background arc */}
        <path
          d="M 8 44 A 32 32 0 0 1 72 44"
          fill="none"
          stroke="#e5e0db"
          strokeWidth={stroke}
          strokeLinecap="round"
        />
        {/* Filled arc */}
        <path
          d="M 8 44 A 32 32 0 0 1 72 44"
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${circumference}`}
          strokeDashoffset={offset}
          className="transition-all duration-700 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-end pb-0">
        <span className="text-sm font-bold text-warm-900">{value}</span>
        <span className="text-[9px] text-warm-400 leading-none">{label}</span>
      </div>
    </div>
  )
}

// ─── Metric badge ─────────────────────────────────────────────────────────────

function MetricBadge({ value, warn, good }: { value: number; warn?: boolean; good?: boolean }) {
  if (value === 0) return <span className="text-sm text-warm-300">—</span>
  return (
    <span className={`inline-flex items-center justify-center min-w-[28px] text-sm font-semibold px-2 py-0.5 rounded-full ${
      warn ? 'bg-amber-50 text-amber-700' :
      good ? 'bg-green-50 text-green-700' :
      'bg-warm-100 text-warm-800'
    }`}>
      {value}
    </span>
  )
}

// ─── Subscription badge ───────────────────────────────────────────────────────

function SubBadge({ status, daysLeft, plan }: { status: string; daysLeft: number | null; plan: string }) {
  if (daysLeft !== null && daysLeft <= 0) {
    return <span className="text-xs bg-red-50 text-red-700 border border-red-200 px-2 py-0.5 rounded-full font-medium">Vencido</span>
  }
  if (daysLeft !== null && daysLeft <= 5) {
    return <span className="text-xs bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full">{daysLeft}d</span>
  }
  if (status === 'trialing') {
    return <span className="text-xs bg-brand-50 text-brand-700 border border-brand-200 px-2 py-0.5 rounded-full">{daysLeft}d trial</span>
  }
  return <span className="text-xs bg-green-50 text-green-700 border border-green-200 px-2 py-0.5 rounded-full">{daysLeft}d</span>
}
