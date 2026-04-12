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

interface UserAnalytics {
  id: string
  email: string
  name: string | null
  role: string
  status: string
  created_at: string
  schools: Array<{ school_name: string; role: string }>
  meetingsCreated: number
  pendingActions: number
  scheduledMeetings: number
  whisperUsage: number
  aiUsage: number
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

  if (status === 'loading' || loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-warm-200 border-t-brand rounded-full animate-spin" />
    </div>
  )

  const statCards = global ? [
    { label: 'Usuarios', value: global.totalUsers, icon: UsersIcon, color: 'text-brand' },
    { label: 'Reuniones', value: global.totalMeetings, icon: DocIcon, color: 'text-warm-700' },
    { label: 'Pendientes', value: global.totalPendingActions, icon: ClockIcon, color: 'text-amber-600' },
    { label: 'Agendadas', value: global.totalScheduled, icon: CalendarIcon, color: 'text-green-600' },
    { label: 'Whisper', value: global.totalWhisper, icon: MicIcon, color: 'text-purple-600' },
    { label: 'IA procesadas', value: global.totalAI, icon: SparklesIcon, color: 'text-brand-600' },
  ] : []

  const columns: Array<{ key: SortKey; label: string; className?: string }> = [
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
              <p className="text-xs text-warm-500">Uso de la plataforma por usuario</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/admin" className="text-xs text-warm-500 hover:text-warm-700 px-3 py-1.5 border border-warm-200 rounded-lg">Admin</Link>
            <Link href="/admin/subscriptions" className="text-xs text-warm-500 hover:text-warm-700 px-3 py-1.5 border border-warm-200 rounded-lg">Suscripciones</Link>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Global stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-8">
          {statCards.map(card => (
            <div key={card.label} className="bg-white rounded-xl border border-warm-200 p-4 flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <card.icon className={`w-4 h-4 ${card.color}`} />
                <span className="text-xs text-warm-500">{card.label}</span>
              </div>
              <p className={`text-2xl font-semibold ${card.color}`}>{card.value}</p>
            </div>
          ))}
        </div>

        {/* Search */}
        <div className="mb-4">
          <input
            type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por nombre, email o escuela..."
            className="w-full sm:max-w-sm text-sm bg-white border border-warm-200 rounded-xl px-4 py-2.5"
          />
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-warm-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-warm-100">
                  {columns.map(col => (
                    <th key={col.key}
                      onClick={() => handleSort(col.key)}
                      className="px-4 py-3 text-left text-xs font-medium text-warm-500 uppercase tracking-wide cursor-pointer hover:text-warm-700 select-none whitespace-nowrap">
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
                </tr>
              </thead>
              <tbody className="divide-y divide-warm-50">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-sm text-warm-400">
                      {search ? `No hay usuarios que coincidan con "${search}"` : 'No hay usuarios'}
                    </td>
                  </tr>
                ) : (
                  filtered.map(u => {
                    const total = u.meetingsCreated + u.whisperUsage + u.aiUsage
                    const isActive = total > 0
                    return (
                      <tr key={u.id} className={`hover:bg-warm-50/50 transition-colors ${!isActive ? 'opacity-50' : ''}`}>
                        <td className="px-4 py-3">
                          <div>
                            <p className="text-sm font-medium text-warm-900">{u.name ?? u.email}</p>
                            {u.name && <p className="text-xs text-warm-400">{u.email}</p>}
                            <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                              {u.schools.map((s, i) => (
                                <span key={i} className="text-xs bg-warm-100 text-warm-600 px-1.5 py-0.5 rounded">
                                  {s.school_name} · {s.role}
                                </span>
                              ))}
                              {u.schools.length === 0 && (
                                <span className="text-xs text-warm-400">Sin escuela</span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <MetricCell value={u.meetingsCreated} />
                        </td>
                        <td className="px-4 py-3">
                          <MetricCell value={u.pendingActions} warn={u.pendingActions > 10} />
                        </td>
                        <td className="px-4 py-3">
                          <MetricCell value={u.scheduledMeetings} good={u.scheduledMeetings > 0} />
                        </td>
                        <td className="px-4 py-3">
                          <MetricCell value={u.whisperUsage} />
                        </td>
                        <td className="px-4 py-3">
                          <MetricCell value={u.aiUsage} />
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        <p className="text-xs text-warm-400 mt-4">
          Whisper = reuniones con entrada de audio. IA = reuniones procesadas con preguntas de seguimiento.
        </p>
      </main>
    </div>
  )
}

// ─── Metric cell ──────────────────────────────────────────────────────────────

function MetricCell({ value, warn, good }: { value: number; warn?: boolean; good?: boolean }) {
  if (value === 0) return <span className="text-sm text-warm-300">—</span>
  return (
    <span className={`text-sm font-medium ${
      warn ? 'text-amber-600' : good ? 'text-green-600' : 'text-warm-900'
    }`}>
      {value}
    </span>
  )
}

// ─── Icons ────────────────────────────────────────────────────────────────────

function UsersIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  )
}

function DocIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  )
}

function ClockIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )
}

function CalendarIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  )
}

function MicIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
    </svg>
  )
}

function SparklesIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
    </svg>
  )
}
