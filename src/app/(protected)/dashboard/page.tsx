'use client'
import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState, useMemo } from 'react'
import { Meeting, MEETING_TYPE_LABELS, MEETING_TYPE_DOT, MEETING_TYPE_COLORS, MeetingType, TOPICS, TOPIC_LABELS, Contact } from '@/types'
import ContactSelector from '@/components/ContactSelector'
import SchoolSwitcher from '@/components/SchoolSwitcher'
import SchoolLogo from '@/components/SchoolLogo'
import AssigneePicker from '@/components/AssigneePicker'
import WhatsNew from '@/components/WhatsNew'
import SubscriptionBanner from '@/components/SubscriptionBanner'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import Link from 'next/link'

// ─── Tipos locales ────────────────────────────────────────────────────────────

interface ThreadSummary {
  id: string
  name: string
  type: MeetingType
  topics: string[] | null
  participants: string | null
  description: string | null
  course: string | null
  subject: string | null
  meetingCount: number
  pendingActions: number
  lastMeetingDate: string | null
  hasAI: boolean
  contactNames: string[]
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function Dashboard() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [tab, setTab] = useState<'hoy' | 'hilos' | 'reuniones' | 'preguntar'>('hoy')

  // Hoy (inbox)
  const [inbox, setInbox] = useState<any>(null)
  const [loadingInbox, setLoadingInbox] = useState(false)
  const [inboxLoaded, setInboxLoaded] = useState(false)
  const [inboxFilter, setInboxFilter] = useState<'mine' | 'all'>('mine')

  // Hilos
  const [threads, setThreads] = useState<ThreadSummary[]>([])
  const [loadingThreads, setLoadingThreads] = useState(true)
  const [error, setError] = useState('')
  const [showNewThread, setShowNewThread] = useState(false)
  const [showMobileMenu, setShowMobileMenu] = useState(false)

  // Reuniones
  const [meetings, setMeetings] = useState<Meeting[]>([])
  const [loadingMeetings, setLoadingMeetings] = useState(false)
  const [meetingsLoaded, setMeetingsLoaded] = useState(false)
  const [search, setSearch] = useState('')
  const [filterCourse, setFilterCourse] = useState('')
  const [filterSubject, setFilterSubject] = useState('')
  const [filterYear, setFilterYear] = useState('')
  const [filterTag, setFilterTag] = useState('')

  // Pendientes
  const [pendingGroups, setPendingGroups] = useState<any[]>([])
  const [pendingCounts, setPendingCounts] = useState<{ all: number; mine: number; unassigned: number }>({ all: 0, mine: 0, unassigned: 0 })
  const [pendingFilter, setPendingFilter] = useState<'all' | 'mine' | 'unassigned'>('all')
  const [loadingPending, setLoadingPending] = useState(false)
  const [pendingLoaded, setPendingLoaded] = useState(false)


  useEffect(() => {
    if (status === 'unauthenticated') router.push('/auth')
  }, [status, router])

  useEffect(() => {
    if (!session) return
    fetch('/api/onboarding')
      .then(r => r.json())
      .then(data => {
        if (!data.onboarded || !data.hasSchool) { router.push('/onboarding'); return }
        return fetch('/api/threads').then(r => r.json()).then(data => {
          setThreads(Array.isArray(data) ? data : [])
          setLoadingThreads(false)
        })
      })
      .catch(() => { setLoadingThreads(false); setError('Error cargando los datos. Recargá la página.') })
  }, [session])

  // Refetch pendientes al cambiar el filtro
  const reloadPending = () => {
    setLoadingPending(true)
    fetch(`/api/actions?filter=${pendingFilter}`)
      .then(r => r.json())
      .then(data => {
        setPendingGroups(Array.isArray(data?.groups) ? data.groups : [])
        if (data?.counts) setPendingCounts(data.counts)
        setPendingLoaded(true); setLoadingPending(false)
      })
      .catch(() => setLoadingPending(false))
  }

  useEffect(() => {
    if (tab === 'hoy' && pendingLoaded) reloadPending()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingFilter])

  // Refetch Hoy al cambiar filtro
  useEffect(() => {
    if (tab === 'hoy' && inboxLoaded) {
      setLoadingInbox(true)
      fetch(`/api/inbox?filter=${inboxFilter}`)
        .then(r => r.json())
        .then(data => { setInbox(data); setLoadingInbox(false) })
        .catch(() => setLoadingInbox(false))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inboxFilter])

  // Carga lazy por tab
  useEffect(() => {
    if (tab === 'hoy') {
      if (!inboxLoaded) {
        setLoadingInbox(true)
        fetch(`/api/inbox?filter=${inboxFilter}`)
          .then(r => r.json())
          .then(data => { setInbox(data); setInboxLoaded(true); setLoadingInbox(false) })
          .catch(() => setLoadingInbox(false))
      }
      if (!pendingLoaded) {
        setLoadingPending(true)
        fetch(`/api/actions?filter=${pendingFilter}`)
          .then(r => r.json())
          .then(data => {
            setPendingGroups(Array.isArray(data?.groups) ? data.groups : [])
            if (data?.counts) setPendingCounts(data.counts)
            setPendingLoaded(true); setLoadingPending(false)
          })
          .catch(() => setLoadingPending(false))
      }
    }
    if (tab === 'reuniones' && !meetingsLoaded) {
      setLoadingMeetings(true)
      fetch('/api/meetings?limit=200')
        .then(r => r.json())
        .then(data => { setMeetings(Array.isArray(data) ? data : []); setMeetingsLoaded(true); setLoadingMeetings(false) })
        .catch(() => setLoadingMeetings(false))
    }
  }, [tab])

  if (status === 'loading' || loadingThreads) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-warm-200 border-t-brand rounded-full animate-spin" />
    </div>
  )

  if (error) return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <div className="text-center">
        <p className="text-sm text-brand-700 mb-3">{error}</p>
        <button onClick={() => window.location.reload()} className="text-sm text-warm-600 underline hover:text-warm-900">Recargar</button>
      </div>
    </div>
  )

  const totalPending = threads.reduce((sum, t) => sum + t.pendingActions, 0)

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-white border-b border-warm-100 px-4 sm:px-6 py-3 sm:py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <SchoolLogo size={36} />
            <div className="min-w-0">
              <SchoolSwitcher
                currentSchoolName={session?.user?.school?.name ?? 'Gestor de reuniones'}
                onSwitch={() => window.location.reload()}
              />
              <p className="text-xs text-warm-500 truncate">{session?.user?.name ?? session?.user?.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
            <Link href="/meeting/new"
              className="text-xs sm:text-sm border border-warm-200 text-warm-700 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg hover:bg-warm-50 transition-colors whitespace-nowrap">
              + Reunión
            </Link>
            <button onClick={() => setShowNewThread(true)}
              className="text-xs sm:text-sm bg-brand text-white px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg hover:bg-brand-600 transition-colors whitespace-nowrap">
              + Hilo
            </button>
            {/* Menú configuración (engranaje) */}
            <div className="relative">
              <button onClick={() => setShowMobileMenu(!showMobileMenu)}
                className="text-warm-400 hover:text-warm-600 p-1.5 sm:p-2 rounded-lg hover:bg-warm-100 transition-colors">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>
              {showMobileMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowMobileMenu(false)} />
                  <div className="absolute right-0 top-full mt-1 z-50 bg-white rounded-xl border border-warm-200 shadow-lg py-1 min-w-[180px]">
                    <Link href="/stats" onClick={() => setShowMobileMenu(false)}
                      className="flex items-center gap-2 px-4 py-2.5 text-sm text-warm-700 hover:bg-warm-50">
                      <svg className="w-4 h-4 text-warm-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                      Estadísticas
                    </Link>
                    <Link href="/contacts" onClick={() => setShowMobileMenu(false)}
                      className="flex items-center gap-2 px-4 py-2.5 text-sm text-warm-700 hover:bg-warm-50">
                      <svg className="w-4 h-4 text-warm-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      Contactos
                    </Link>
                    {(session?.user?.role === 'owner' || session?.user?.role === 'director' || session?.user?.role === 'vicedirector') && (
                      <Link href="/users" onClick={() => setShowMobileMenu(false)}
                        className="flex items-center gap-2 px-4 py-2.5 text-sm text-warm-700 hover:bg-warm-50">
                        <svg className="w-4 h-4 text-warm-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                        </svg>
                        Usuarios
                      </Link>
                    )}
                    {session?.user?.role === 'owner' && (
                      <Link href="/dashboard/group" onClick={() => setShowMobileMenu(false)}
                        className="flex items-center gap-2 px-4 py-2.5 text-sm text-warm-700 hover:bg-warm-50">
                        <svg className="w-4 h-4 text-warm-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                        Grupo
                      </Link>
                    )}
                    {session?.user?.id === '757692ca-333e-469d-a9eb-d370db452cde' && (
                      <Link href="/admin" onClick={() => setShowMobileMenu(false)}
                        className="flex items-center gap-2 px-4 py-2.5 text-sm text-warm-700 hover:bg-warm-50">
                        <svg className="w-4 h-4 text-warm-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                        </svg>
                        Admin
                      </Link>
                    )}
                    <Link href="/billing" onClick={() => setShowMobileMenu(false)}
                      className="flex items-center gap-2 px-4 py-2.5 text-sm text-warm-700 hover:bg-warm-50">
                      <svg className="w-4 h-4 text-warm-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                      </svg>
                      Suscripción
                    </Link>
                    <div className="border-t border-warm-100 mt-1 pt-1">
                      <button onClick={() => { setShowMobileMenu(false); signOut({ callbackUrl: '/auth' }) }}
                        className="flex items-center gap-2 px-4 py-2.5 text-sm text-warm-500 hover:bg-warm-50 w-full text-left">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                        Cerrar sesión
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      <SubscriptionBanner />

      {/* Tabs */}
      <div className="bg-white border-b border-warm-100 px-4 sm:px-6 overflow-x-auto">
        <div className="max-w-4xl mx-auto flex gap-4 sm:gap-8">
          {(['hoy', 'hilos', 'reuniones', 'preguntar'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`text-sm py-3 border-b-2 transition-colors whitespace-nowrap ${
                tab === t ? 'border-brand text-warm-900 font-medium' : 'border-transparent text-warm-500 hover:text-warm-700'
              }`}>
              {t === 'hoy' ? 'Hoy' : t === 'hilos' ? 'Hilos' : t === 'reuniones' ? 'Reuniones' : 'Preguntar'}
              {t === 'hoy' && totalPending > 0 && (
                <span className="ml-2 bg-brand text-white text-xs px-1.5 py-0.5 rounded-full">{totalPending}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8 pb-8">
        {tab === 'hoy' && (
          <HoyTab
            inbox={inbox}
            loading={loadingInbox}
            directorName={session?.user?.name ?? session?.user?.email ?? ''}
            filter={inboxFilter}
            onFilterChange={setInboxFilter}
            pendingGroups={pendingGroups}
            pendingCounts={pendingCounts}
            pendingFilter={pendingFilter}
            onPendingFilterChange={setPendingFilter}
            loadingPending={loadingPending}
            currentUserId={session?.user?.id ?? ''}
            onToggle={async (meetingId, actionId) => {
              await fetch(`/api/meetings/${meetingId}/actions/${actionId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ done: true }),
              })
              reloadPending()
            }}
            onAssign={async (meetingId, actionId, value) => {
              await fetch(`/api/meetings/${meetingId}/actions/${actionId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  assigned_user_id: value.userId,
                  assigned_contact_id: value.contactId,
                  assigned_to: value.userId || value.contactId ? null : undefined,
                }),
              })
              reloadPending()
            }}
          />
        )}
        {tab === 'hilos' && <HilosTab threads={threads} onNewThread={() => setShowNewThread(true)} onUnarchive={() => {
          fetch('/api/threads').then(r => r.json()).then(data => { setThreads(Array.isArray(data) ? data : []) })
        }} />}
        {tab === 'reuniones' && (
          <ReunionesTab
            meetings={meetings}
            loading={loadingMeetings}
            search={search} setSearch={setSearch}
            filterCourse={filterCourse} setFilterCourse={setFilterCourse}
            filterSubject={filterSubject} setFilterSubject={setFilterSubject}
            filterYear={filterYear} setFilterYear={setFilterYear}
            filterTag={filterTag} setFilterTag={setFilterTag}
          />
        )}
        {tab === 'preguntar' && <AskTab />}
      </main>

      {showNewThread && (
        <NewThreadModal
          onClose={() => setShowNewThread(false)}
          onCreated={(thread) => { setShowNewThread(false); router.push(`/thread/${thread.id}`) }}
        />
      )}

      <WhatsNew />
    </div>
  )
}

// ─── Tab: Hilos ───────────────────────────────────────────────────────────────

function HilosTab({ threads, onNewThread, onUnarchive }: { threads: ThreadSummary[]; onNewThread: () => void; onUnarchive: () => void }) {
  const [search, setSearch] = useState('')
  const [filterTopic, setFilterTopic] = useState('')
  const [showArchived, setShowArchived] = useState(false)
  const [archivedThreads, setArchivedThreads] = useState<ThreadSummary[]>([])
  const [loadingArchived, setLoadingArchived] = useState(false)

  const loadArchived = async () => {
    if (!showArchived) { setShowArchived(true); setLoadingArchived(true)
      const res = await fetch('/api/threads?archived=true')
      if (res.ok) setArchivedThreads(await res.json())
      setLoadingArchived(false)
    } else { setShowArchived(false) }
  }

  const unarchiveThread = async (threadId: string) => {
    await fetch(`/api/threads/${threadId}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ archived: false }),
    })
    setArchivedThreads(prev => prev.filter(t => t.id !== threadId))
    onUnarchive()
  }

  const filtered = threads.filter(t => {
    if (filterTopic && !(t.topics ?? []).includes(filterTopic)) return false
    if (search) {
      const q = search.toLowerCase()
      const contactStr = (t.contactNames ?? []).join(' ')
      if (!`${t.name} ${t.participants ?? ''} ${t.course ?? ''} ${t.subject ?? ''} ${contactStr}`.toLowerCase().includes(q)) return false
    }
    return true
  })

  const topicsInUse = Array.from(new Set(threads.flatMap(t => t.topics ?? []).filter(Boolean))) as string[]

  return (
    <div>
      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          { label: 'Hilos activos', value: threads.length },
          { label: 'Acciones pendientes', value: threads.reduce((s, t) => s + t.pendingActions, 0) },
          { label: 'Con reuniones', value: threads.filter(t => t.meetingCount > 0).length },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl border border-warm-200 p-4">
            <p className="text-xs text-warm-500 mb-1">{s.label}</p>
            <p className="text-2xl font-medium text-warm-900">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-warm-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-warm-100 space-y-3">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-sm font-medium text-warm-900 flex-shrink-0">Hilos de seguimiento</h2>
            {threads.length > 0 && (
              <input
                type="text" value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Buscar por nombre, contacto, curso..."
                className="flex-1 text-xs bg-warm-50 border border-warm-200 rounded-lg px-3 py-1.5 max-w-xs"
              />
            )}
            <span className="text-xs text-warm-400 flex-shrink-0">
              {(search || filterTopic) ? `${filtered.length} de ${threads.length}` : `${threads.length} hilos`}
            </span>
          </div>
          {topicsInUse.length > 0 && (
            <div className="flex gap-2 flex-wrap">
              <button onClick={() => setFilterTopic('')}
                className={`text-xs px-3 py-1 rounded-full border transition-colors ${!filterTopic ? 'bg-brand text-white border-brand' : 'border-warm-200 text-warm-500 hover:border-warm-300'}`}>
                Todos
              </button>
              {topicsInUse.map(t => (
                <button key={t} onClick={() => setFilterTopic(filterTopic === t ? '' : t)}
                  className={`text-xs px-3 py-1 rounded-full border transition-colors capitalize ${filterTopic === t ? 'bg-brand text-white border-brand' : 'border-warm-200 text-warm-500 hover:border-warm-300'}`}>
                  {TOPIC_LABELS[t as keyof typeof TOPIC_LABELS] ?? t}
                </button>
              ))}
            </div>
          )}
        </div>
        {threads.length === 0 ? (
          <div className="text-center py-16 px-6">
            <div className="w-12 h-12 bg-warm-100 rounded-xl flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-warm-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <p className="text-sm font-medium text-warm-900 mb-1">Creá tu primer hilo</p>
            <p className="text-sm text-warm-500 mb-5">Un hilo agrupa todas las reuniones con la misma persona o grupo.</p>
            <button onClick={onNewThread}
              className="text-sm bg-brand text-white px-5 py-2.5 rounded-lg hover:bg-brand-600 transition-colors">
              Crear primer hilo
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-10 text-sm text-warm-400">
            No hay hilos que coincidan con "{search}"
          </div>
        ) : (
          <div className="divide-y divide-warm-100">
            {filtered.map(t => (
              <Link key={t.id} href={`/thread/${t.id}`}
                className="flex items-center gap-4 px-5 py-4 hover:bg-warm-50 transition-colors">
                <div className="w-10 h-10 rounded-full bg-warm-100 flex items-center justify-center flex-shrink-0 text-sm font-medium text-warm-600">
                  {(t.name ?? '?').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium text-warm-900 truncate">{t.name}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 ${
                      t.type === 'docentes' ? 'bg-brand-50 text-brand-700' :
                      t.type === 'padres' ? 'bg-warm-50 text-warm-700' :
                      t.type === 'individual' ? 'bg-brand-100 text-brand-600' : 'bg-warm-100 text-warm-600'
                    }`}>{MEETING_TYPE_LABELS[t.type]}</span>
                    {t.course && <span className="text-xs text-warm-400">{t.course}</span>}
                    {t.subject && <span className="text-xs text-warm-400">{t.subject}</span>}
                  </div>
                  <p className="text-xs text-warm-500 mt-0.5 truncate">
                    {(t.contactNames ?? []).length > 0
                      ? t.contactNames.slice(0, 3).join(', ') + (t.contactNames.length > 3 ? ` +${t.contactNames.length - 3}` : '')
                      : t.description ?? 'Sin participantes definidos'}
                  </p>
                </div>
                <div className="text-right flex-shrink-0 space-y-1">
                  {t.pendingActions > 0 && (
                    <div className="flex items-center justify-end gap-1">
                      <span className="w-2 h-2 bg-brand rounded-full" />
                      <span className="text-xs text-brand-700">{t.pendingActions} pendiente{t.pendingActions > 1 ? 's' : ''}</span>
                    </div>
                  )}
                  {t.lastMeetingDate ? (() => {
                    const days = Math.floor((Date.now() - new Date(t.lastMeetingDate).getTime()) / 86400000)
                    const label = days === 0 ? 'hoy' : days === 1 ? 'ayer' : `hace ${days} días`
                    const color = days > 60 ? 'text-brand-700' : days > 30 ? 'text-brand-400' : 'text-warm-400'
                    return <p className={`text-xs ${color}`}>{label}</p>
                  })() : <p className="text-xs text-warm-400">Sin reuniones</p>}
                  {t.meetingCount > 0 && <p className="text-xs text-warm-400">{t.meetingCount} reunión{t.meetingCount > 1 ? 'es' : ''}</p>}
                </div>
                <svg className="w-4 h-4 text-warm-300 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Hilos archivados */}
      <button onClick={loadArchived}
        className="mt-6 text-xs text-warm-400 hover:text-warm-600 flex items-center gap-1.5 transition-colors">
        <svg className={`w-3.5 h-3.5 transition-transform ${showArchived ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
        {showArchived ? 'Ocultar archivados' : 'Ver hilos archivados'}
      </button>
      {showArchived && (
        <div className="mt-3 bg-white rounded-xl border border-warm-200 overflow-hidden">
          {loadingArchived ? (
            <div className="px-5 py-4 text-sm text-warm-400">Cargando...</div>
          ) : archivedThreads.length === 0 ? (
            <div className="px-5 py-4 text-sm text-warm-400">No hay hilos archivados</div>
          ) : (
            <div className="divide-y divide-warm-100">
              {archivedThreads.map(t => (
                <div key={t.id} className="flex items-center gap-4 px-5 py-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-warm-600 truncate">{t.name}</p>
                    <p className="text-xs text-warm-400">{t.meetingCount} reunión{t.meetingCount !== 1 ? 'es' : ''}</p>
                  </div>
                  <button onClick={() => unarchiveThread(t.id)}
                    className="text-xs text-brand hover:text-brand-700 font-medium flex-shrink-0">
                    Reactivar
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Tab: Reuniones (Kanban) ──────────────────────────────────────────────────

const COLUMNS: MeetingType[] = ['docentes', 'padres', 'individual', 'direccion']

const COLUMN_STYLES: Record<MeetingType, { header: string; dot: string }> = {
  docentes:    { header: 'bg-brand-50 text-brand-700 border-brand-200',   dot: 'bg-brand' },
  padres:      { header: 'bg-warm-50 text-warm-700 border-warm-200', dot: 'bg-warm-400' },
  individual:  { header: 'bg-brand-100 text-brand-600 border-brand-200', dot: 'bg-brand-300' },
  direccion:   { header: 'bg-warm-100 text-warm-600 border-warm-200',   dot: 'bg-warm-300' },
}

function ReunionesTab({
  meetings, loading,
  search, setSearch,
  filterCourse, setFilterCourse,
  filterSubject, setFilterSubject,
  filterYear, setFilterYear,
  filterTag, setFilterTag,
}: {
  meetings: Meeting[]; loading: boolean
  search: string; setSearch: (v: string) => void
  filterCourse: string; setFilterCourse: (v: string) => void
  filterSubject: string; setFilterSubject: (v: string) => void
  filterYear: string; setFilterYear: (v: string) => void
  filterTag: string; setFilterTag: (v: string) => void
}) {
  // Opciones únicas para filtros
  const courses = useMemo(() => Array.from(new Set(meetings.map(m => m.course).filter(Boolean))) as string[], [meetings])
  const subjects = useMemo(() => Array.from(new Set(meetings.map(m => m.subject).filter(Boolean))) as string[], [meetings])
  const years = useMemo(() => Array.from(new Set(meetings.map(m => m.academic_year).filter(Boolean))).sort() as number[], [meetings])
  const allTags = useMemo(() => Array.from(new Set(meetings.flatMap(m => m.tags ?? []))).sort(), [meetings])

  const filtered = useMemo(() => meetings.filter(m => {
    if (search && !`${m.title} ${m.participants ?? ''} ${m.notes}`.toLowerCase().includes(search.toLowerCase())) return false
    if (filterCourse && m.course !== filterCourse) return false
    if (filterSubject && m.subject !== filterSubject) return false
    if (filterYear && String(m.academic_year) !== filterYear) return false
    if (filterTag && !(m.tags ?? []).includes(filterTag)) return false
    return true
  }), [meetings, search, filterCourse, filterSubject, filterYear, filterTag])

  const byType = useMemo(() => {
    const map: Record<MeetingType, Meeting[]> = { docentes: [], padres: [], individual: [], direccion: [] }
    for (const m of filtered) map[m.type].push(m)
    return map
  }, [filtered])

  const hasFilters = search || filterCourse || filterSubject || filterYear || filterTag
  const [showFilters, setShowFilters] = useState(false)
  const activeFilterCount = [filterCourse, filterSubject, filterYear, filterTag].filter(Boolean).length

  if (loading) return (
    <div className="flex items-center justify-center py-24">
      <div className="w-6 h-6 border-2 border-warm-200 border-t-brand rounded-full animate-spin" />
    </div>
  )

  return (
    <div>
      {/* Barra de búsqueda y filtros */}
      <div className="mb-6 space-y-3">
        <div className="flex gap-2">
          <input
            type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Buscar reuniones..."
            className="flex-1 text-sm bg-white border border-warm-200 rounded-xl px-4 py-2.5"
          />
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`text-xs border rounded-xl px-3 py-2 flex items-center gap-1.5 transition-colors flex-shrink-0 ${
              showFilters || activeFilterCount > 0
                ? 'border-brand text-brand bg-brand-50'
                : 'border-warm-200 text-warm-500 hover:border-warm-300'
            }`}>
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            Filtros{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
          </button>
        </div>
        {showFilters && (
          <div className="flex gap-2 flex-wrap">
            <select value={filterCourse} onChange={e => setFilterCourse(e.target.value)}
              className="text-xs border border-warm-200 rounded-lg px-3 py-1.5 bg-white">
              <option value="">Todos los cursos</option>
              {courses.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <select value={filterSubject} onChange={e => setFilterSubject(e.target.value)}
              className="text-xs border border-warm-200 rounded-lg px-3 py-1.5 bg-white">
              <option value="">Todas las materias</option>
              {subjects.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <select value={filterYear} onChange={e => setFilterYear(e.target.value)}
              className="text-xs border border-warm-200 rounded-lg px-3 py-1.5 bg-white">
              <option value="">Todos los años</option>
              {years.map(y => <option key={y} value={String(y)}>{y}</option>)}
            </select>
            <select value={filterTag} onChange={e => setFilterTag(e.target.value)}
              className="text-xs border border-warm-200 rounded-lg px-3 py-1.5 bg-white">
              <option value="">Todas las etiquetas</option>
              {allTags.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            {hasFilters && (
              <button onClick={() => { setSearch(''); setFilterCourse(''); setFilterSubject(''); setFilterYear(''); setFilterTag('') }}
                className="text-xs text-warm-500 hover:text-warm-700 px-3 py-1.5">
                Limpiar
              </button>
            )}
          </div>
        )}
      </div>

      {meetings.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-sm font-medium text-warm-900 mb-1">No hay reuniones todavía</p>
          <p className="text-sm text-warm-500 mb-5">Creá tu primera reunión para empezar.</p>
          <Link href="/meeting/new"
            className="text-sm bg-brand text-white px-5 py-2.5 rounded-lg hover:bg-brand-600 transition-colors">
            Nueva reunión
          </Link>
        </div>
      ) : (
        /* Kanban */
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 items-start">
          {COLUMNS.map(col => {
            const style = COLUMN_STYLES[col]
            const colMeetings = byType[col]
            return (
              <div key={col} className="min-w-0">
                {/* Header columna */}
                <div className={`flex items-center justify-between px-3 py-2 rounded-lg border mb-3 ${style.header}`}>
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${style.dot}`} />
                    <span className="text-xs font-medium">{MEETING_TYPE_LABELS[col]}</span>
                  </div>
                  <span className="text-xs opacity-60">{colMeetings.length}</span>
                </div>

                {/* Cards */}
                <div className="space-y-2">
                  {colMeetings.length === 0 ? (
                    <div className="text-center py-8 text-xs text-warm-400 border-2 border-dashed border-warm-200 rounded-xl">
                      Sin reuniones
                    </div>
                  ) : (
                    colMeetings.map(m => (
                      <Link key={m.id} href={`/meeting/${m.id}`}
                        className="block bg-white rounded-xl border border-warm-200 p-3 hover:border-warm-300 hover:shadow-sm transition-all">
                        <p className="text-sm font-medium text-warm-900 leading-snug mb-1">{m.title}</p>
                        {m.participants && (
                          <p className="text-xs text-warm-500 truncate mb-1">{m.participants}</p>
                        )}
                        <div className="flex items-center justify-between">
                          <p className="text-xs text-warm-400">
                            {format(parseISO(m.meeting_date), 'd MMM', { locale: es })}
                          </p>
                          <div className="flex items-center gap-1">
                            {m.thread_id && (
                              <span className="w-1.5 h-1.5 rounded-full bg-brand" title="Tiene hilo" />
                            )}
                            {m.ai_questions && (
                              <span className="w-1.5 h-1.5 rounded-full bg-warm-400" title="IA lista" />
                            )}
                          </div>
                        </div>
                        {(m.course || m.tags?.length) ? (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {m.course && (
                              <span className="text-xs bg-warm-100 text-warm-600 px-1.5 py-0.5 rounded">{m.course}</span>
                            )}
                            {(m.tags ?? []).slice(0, 2).map(tag => (
                              <span key={tag} className="text-xs bg-warm-100 text-warm-600 px-1.5 py-0.5 rounded">{tag}</span>
                            ))}
                            {(m.tags?.length ?? 0) > 2 && (
                              <span className="text-xs text-warm-400 px-1 py-0.5">+{(m.tags?.length ?? 0) - 2}</span>
                            )}
                          </div>
                        ) : null}
                      </Link>
                    ))
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── Modal nuevo hilo ─────────────────────────────────────────────────────────

function NewThreadModal({ onClose, onCreated }: {
  onClose: () => void
  onCreated: (thread: any) => void
}) {
  const [name, setName] = useState('')
  const [type, setType] = useState<MeetingType>('individual')
  const [selectedContacts, setSelectedContacts] = useState<Contact[]>([])
  const [topics, setTopics] = useState<string[]>([])
  const [description, setDescription] = useState('')
  const [course, setCourse] = useState('')
  const [subject, setSubject] = useState('')
  const [academicYear, setAcademicYear] = useState('')
  const [tagsInput, setTagsInput] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const TYPES: MeetingType[] = ['docentes', 'padres', 'individual', 'direccion']

  const handleCreate = async () => {
    if (!name.trim()) { setError('El nombre es requerido.'); return }
    setSaving(true); setError('')
    const tags = tagsInput.trim() ? tagsInput.split(',').map(t => t.trim()).filter(Boolean) : undefined
    const res = await fetch('/api/threads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name, type, description,
        course: course.trim() || undefined,
        subject: subject.trim() || undefined,
        academic_year: academicYear ? Number(academicYear) : undefined,
        tags,
        topics: topics.length ? topics : undefined,
        contact_ids: selectedContacts.map(c => c.id),
      }),
    })
    if (!res.ok) { setSaving(false); setError('Error creando el hilo.'); return }
    const thread = await res.json()
    onCreated(thread)
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '1rem' }}>
      <div className="bg-white rounded-2xl border border-warm-200 w-full max-w-md p-4 sm:p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-medium text-warm-900">Nuevo hilo de seguimiento</h2>
          <button onClick={onClose} className="text-warm-400 hover:text-warm-600">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-xs font-medium text-warm-500 uppercase tracking-wide block mb-1.5">Nombre del hilo *</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)}
              placeholder="Ej: Prof. García · Familia Rodríguez · Equipo docente"
              className="w-full text-sm" autoFocus />
          </div>

          <div>
            <label className="text-xs font-medium text-warm-500 uppercase tracking-wide block mb-2">Tipo de reunión</label>
            <div className="flex gap-2 flex-wrap">
              {TYPES.map(t => (
                <button key={t} onClick={() => setType(t)}
                  className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                    type === t ? 'bg-brand text-white border-brand' : 'border-warm-200 text-warm-600 hover:border-warm-300'
                  }`}>
                  {MEETING_TYPE_LABELS[t]}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-warm-500 uppercase tracking-wide block mb-2">Temas <span className="text-warm-400 normal-case font-normal">(opcional, podés elegir varios)</span></label>
            <div className="flex gap-2 flex-wrap">
              {TOPICS.map(t => (
                <button key={t} type="button" onClick={() => setTopics(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t])}
                  className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                    topics.includes(t) ? 'bg-brand text-white border-brand' : 'border-warm-200 text-warm-600 hover:border-warm-300'
                  }`}>
                  {TOPIC_LABELS[t]}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-warm-500 uppercase tracking-wide block mb-1.5">Participantes habituales</label>
            <ContactSelector selected={selectedContacts} onChange={setSelectedContacts} />
          </div>

          <div>
            <label className="text-xs font-medium text-warm-500 uppercase tracking-wide block mb-1.5">
              Descripción <span className="text-warm-400 normal-case font-normal">(opcional)</span>
            </label>
            <input type="text" value={description} onChange={e => setDescription(e.target.value)}
              placeholder="Ej: Seguimiento mensual del rendimiento de 3er grado" className="w-full text-sm" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-warm-500 uppercase tracking-wide block mb-1.5">Curso</label>
              <input type="text" value={course} onChange={e => setCourse(e.target.value)}
                placeholder="Ej: 3ro A" className="w-full text-sm" />
            </div>
            <div>
              <label className="text-xs font-medium text-warm-500 uppercase tracking-wide block mb-1.5">Materia</label>
              <input type="text" value={subject} onChange={e => setSubject(e.target.value)}
                placeholder="Ej: Matemáticas" className="w-full text-sm" />
            </div>
            <div>
              <label className="text-xs font-medium text-warm-500 uppercase tracking-wide block mb-1.5">Año lectivo</label>
              <input type="number" value={academicYear} onChange={e => setAcademicYear(e.target.value)}
                min={2020} max={2040} className="w-full text-sm" />
            </div>
            <div>
              <label className="text-xs font-medium text-warm-500 uppercase tracking-wide block mb-1.5">Etiquetas</label>
              <input type="text" value={tagsInput} onChange={e => setTagsInput(e.target.value)}
                placeholder="urgente, seguimiento" className="w-full text-sm" />
            </div>
          </div>
        </div>

        {error && <p className="text-sm text-brand-700 mt-3">{error}</p>}

        <div className="flex gap-3 mt-6">
          <button onClick={handleCreate} disabled={saving}
            className="flex-1 bg-brand text-white text-sm py-3 rounded-xl font-medium hover:bg-brand-600 transition-colors disabled:opacity-50">
            {saving ? 'Creando...' : 'Crear hilo'}
          </button>
          <button onClick={onClose}
            className="px-4 py-3 text-sm text-warm-600 border border-warm-200 rounded-xl hover:bg-warm-50">
            Cancelar
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Tab: Hoy (bandeja del director) ──────────────────────────────────────────

function HoyTab({ inbox, loading, directorName, filter, onFilterChange,
  pendingGroups, pendingCounts, pendingFilter, onPendingFilterChange, loadingPending, currentUserId, onToggle, onAssign
}: {
  inbox: any
  loading: boolean
  directorName: string
  filter: 'mine' | 'all'
  onFilterChange: (f: 'mine' | 'all') => void
  pendingGroups: any[]
  pendingCounts: { all: number; mine: number; unassigned: number }
  pendingFilter: 'all' | 'mine' | 'unassigned'
  onPendingFilterChange: (f: 'all' | 'mine' | 'unassigned') => void
  loadingPending: boolean
  currentUserId: string
  onToggle: (meetingId: string, actionId: string) => void
  onAssign: (meetingId: string, actionId: string, value: { userId: string | null; contactId: string | null }) => Promise<void>
}) {
  if (loading || !inbox) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-6 h-6 border-2 border-warm-200 border-t-brand rounded-full animate-spin" />
      </div>
    )
  }

  const { upcomingMeetings = [], pendingActions = [], unprocessedMeetings = [], totals = {} } = inbox
  const isEmpty = !upcomingMeetings.length && !pendingActions.length && !unprocessedMeetings.length
  const firstName = directorName.split(' ')[0]

  const fmtDate = (iso: string) => {
    const [y, m, d] = iso.split('-').map(Number)
    return format(new Date(y, m - 1, d), "EEE d 'de' MMM", { locale: es })
  }

  return (
    <div className="space-y-6">
      {/* Saludo */}
      <div>
        <h2 className="text-xl font-medium text-warm-900">Hola {firstName} 👋</h2>
        <p className="text-sm text-warm-500 mt-1">
          {isEmpty
            ? 'Tu semana arranca limpia. Nada urgente por mirar.'
            : 'Esto es lo que tenés esta semana.'}
        </p>
      </div>

      {/* Stats mini */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-xl border border-warm-200 p-4">
          <p className="text-2xl font-medium text-warm-900">{totals.upcoming ?? 0}</p>
          <p className="text-xs text-warm-500 mt-0.5">Reuniones</p>
        </div>
        <div className="bg-white rounded-xl border border-warm-200 p-4">
          <p className="text-2xl font-medium text-warm-900">{totals.unprocessed ?? 0}</p>
          <p className="text-xs text-warm-500 mt-0.5">Sin IA</p>
        </div>
        <div className="bg-white rounded-xl border border-warm-200 p-4">
          <p className="text-2xl font-medium text-brand-700">{totals.pending ?? 0}</p>
          <p className="text-xs text-warm-500 mt-0.5">Pendientes</p>
        </div>
      </div>

      {/* Reuniones esta semana */}
      {upcomingMeetings.length > 0 && (
        <section>
          <h3 className="text-xs font-medium text-warm-500 uppercase tracking-wide mb-3">
            Reuniones esta semana
          </h3>
          <div className="bg-white rounded-xl border border-warm-200 divide-y divide-warm-100">
            {upcomingMeetings.map((m: any) => (
              <Link key={m.id} href={`/meeting/${m.id}`}
                className="flex items-center gap-4 px-5 py-4 hover:bg-warm-50 transition-colors">
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${MEETING_TYPE_DOT[m.type as MeetingType] ?? 'bg-warm-300'}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-warm-900 truncate">{m.title}</p>
                  <p className="text-xs text-warm-500 mt-0.5">
                    {fmtDate(m.next_date)}
                    {m.next_time ? ` · ${m.next_time.slice(0, 5)}` : ''}
                    {m.threadName ? ` · ${m.threadName}` : ''}
                  </p>
                </div>
                <svg className="w-4 h-4 text-warm-300 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Sin procesar con IA */}
      {unprocessedMeetings.length > 0 && (
        <section>
          <h3 className="text-xs font-medium text-warm-500 uppercase tracking-wide mb-3">
            Reuniones sin procesar con IA
          </h3>
          <div className="bg-white rounded-xl border border-warm-200 divide-y divide-warm-100">
            {unprocessedMeetings.map((m: any) => (
              <Link key={m.id} href={`/meeting/${m.id}`}
                className="flex items-center gap-4 px-5 py-4 hover:bg-warm-50 transition-colors">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-warm-900 truncate">{m.title}</p>
                  <p className="text-xs text-warm-500 mt-0.5">{fmtDate(m.meeting_date)}</p>
                </div>
                <span className="text-xs text-brand-600 flex-shrink-0">Procesar →</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Pendientes completos */}
      <section>
        <div className="flex items-end justify-between mb-3 gap-3 flex-wrap">
          <h3 className="text-xs font-medium text-warm-500 uppercase tracking-wide">
            Todas las acciones pendientes
          </h3>
          <div className="flex gap-1 bg-warm-100 rounded-full p-0.5">
            {([
              { id: 'all' as const, label: 'Todas' },
              { id: 'mine' as const, label: 'Mías' },
              { id: 'unassigned' as const, label: 'Sin asignar' },
            ]).map(f => (
              <button key={f.id}
                onClick={() => onPendingFilterChange(f.id)}
                className={`text-xs px-3 py-1 rounded-full transition-colors ${
                  pendingFilter === f.id ? 'bg-white text-warm-900 shadow-sm' : 'text-warm-500'
                }`}>
                {f.label}
                <span className={`ml-1 ${pendingFilter === f.id ? 'text-warm-500' : 'text-warm-400'}`}>
                  {pendingCounts[f.id]}
                </span>
              </button>
            ))}
          </div>
        </div>

        {loadingPending ? (
          <div className="flex justify-center py-10">
            <div className="w-6 h-6 border-2 border-warm-200 border-t-brand rounded-full animate-spin" />
          </div>
        ) : pendingGroups.length === 0 ? (
          <div className="bg-white rounded-xl border border-warm-200 p-8 text-center">
            <div className="w-10 h-10 rounded-full bg-brand-50 flex items-center justify-center mx-auto mb-3">
              <svg className="w-5 h-5 text-brand" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-sm font-medium text-warm-900">
              {pendingFilter === 'mine' ? 'No tenés pendientes asignados a vos' :
               pendingFilter === 'unassigned' ? 'Todas las acciones tienen responsable' :
               'Todo al día'}
            </p>
          </div>
        ) : (
          <PendientesSection
            groups={pendingGroups}
            currentUserId={currentUserId}
            onToggle={onToggle}
            onAssign={onAssign}
          />
        )}
      </section>
    </div>
  )
}

// ─── Sección pendientes (usada dentro de HoyTab) ────────────────────────────

function PendientesSection({ groups, currentUserId, onToggle, onAssign }: {
  groups: any[]
  currentUserId: string
  onToggle: (meetingId: string, actionId: string) => void
  onAssign: (meetingId: string, actionId: string, value: { userId: string | null; contactId: string | null }) => Promise<void>
}) {
  const [pickerFor, setPickerFor] = useState<{ meetingId: string; action: any } | null>(null)

  return (
    <div className="space-y-3">
      {groups.map((group) => (
        <div key={group.thread.id} className="bg-white rounded-xl border border-warm-200 overflow-hidden">
          <div className="px-5 py-3 border-b border-warm-100 flex items-center justify-between">
            <Link href={`/thread/${group.thread.id}`}
              className="flex items-center gap-2 hover:opacity-80 transition-opacity">
              <span className="text-sm font-medium text-warm-900">{group.thread.name}</span>
              <svg className="w-3.5 h-3.5 text-warm-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
            <span className="text-xs bg-brand-100 text-brand-600 px-2 py-0.5 rounded-full">
              {group.actions.length} pendiente{group.actions.length !== 1 ? 's' : ''}
            </span>
          </div>
          <div className="divide-y divide-warm-50">
            {group.actions.map((action: any) => {
              const assigneeName = action.assigned_user?.name ?? action.assigned_user?.email
                ?? action.assigned_contact?.name ?? action.assigned_to ?? null
              const isMine = action.isMine
              const isUnassigned = action.isUnassigned
              return (
                <div key={action.id}
                  className={`flex items-start gap-3 px-5 py-3 ${isMine ? 'bg-brand-50/40' : ''}`}>
                  <button
                    onClick={() => onToggle(action.meeting_id, action.id)}
                    className="w-4 h-4 mt-0.5 rounded border border-warm-300 hover:border-brand hover:bg-brand-50 flex items-center justify-center flex-shrink-0 transition-colors"
                    title="Marcar como hecho" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-warm-800">{action.text}</p>
                    <div className="flex items-center gap-3 mt-1 flex-wrap">
                      <p className="text-xs text-warm-400">
                        {action.meeting_title} · {format(parseISO(action.meeting_date), "d MMM yyyy", { locale: es })}
                      </p>
                      <button
                        onClick={() => setPickerFor({ meetingId: action.meeting_id, action })}
                        className={`text-xs px-2 py-0.5 rounded-full border transition-colors ${
                          isUnassigned
                            ? 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
                            : isMine
                            ? 'bg-brand text-white border-brand hover:opacity-90'
                            : 'bg-warm-100 text-warm-700 border-warm-200 hover:bg-warm-200'
                        }`}>
                        {isUnassigned ? 'Sin asignar' : `${isMine ? '● ' : ''}${assigneeName}`}
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ))}

      {pickerFor && (
        <AssigneePicker
          currentUserId={pickerFor.action.assigned_user_id ?? null}
          currentContactId={pickerFor.action.assigned_contact_id ?? null}
          onSelect={async (value) => {
            await onAssign(pickerFor.meetingId, pickerFor.action.id, value)
          }}
          onClose={() => setPickerFor(null)}
        />
      )}
    </div>
  )
}

// ─── Tab: Preguntar ───────────────────────────────────────────────────────────

function AskTab() {
  const [question, setQuestion] = useState('')
  const [loading, setLoading] = useState(false)
  const [answer, setAnswer] = useState<string | null>(null)
  const [sources, setSources] = useState<Array<{ id: string; title: string; meeting_date: string; type: string; threadName: string | null }>>([])
  const [error, setError] = useState<string | null>(null)

  const suggestions = [
    '¿Qué dijimos sobre la familia García?',
    '¿Qué compromisos quedaron pendientes con 5° grado?',
    '¿Qué temas recurrentes aparecen en reuniones con padres?',
  ]

  async function handleAsk(q?: string) {
    const query = (q ?? question).trim()
    if (!query) return
    setLoading(true)
    setError(null)
    setAnswer(null)
    setSources([])
    try {
      const res = await fetch('/api/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: query }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Error')
      setAnswer(data.answer)
      setSources(data.sources ?? [])
      if (q) setQuestion(q)
    } catch (e: any) {
      setError(e.message ?? 'Error consultando')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-warm-900 mb-2">Preguntá sobre tus reuniones</h2>
        <p className="text-warm-600 text-sm">Busco semánticamente en el historial y te respondo citando las reuniones relevantes.</p>
      </div>

      <div className="bg-white border border-warm-200 rounded-xl p-4">
        <textarea
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleAsk() }}
          placeholder="Ej: ¿qué pasó con el caso de bullying de 6°?"
          rows={3}
          maxLength={500}
          className="w-full resize-none border-0 focus:outline-none text-warm-900 placeholder:text-warm-400"
        />
        <div className="flex items-center justify-between pt-2 border-t border-warm-100">
          <span className="text-xs text-warm-400">{question.length}/500 · Ctrl+Enter para enviar</span>
          <button
            onClick={() => handleAsk()}
            disabled={loading || !question.trim()}
            className="px-4 py-2 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg"
          >
            {loading ? 'Pensando…' : 'Preguntar'}
          </button>
        </div>
      </div>

      {!answer && !loading && !error && (
        <div className="space-y-2">
          <p className="text-xs text-warm-500 uppercase tracking-wide">Ejemplos</p>
          {suggestions.map((s) => (
            <button
              key={s}
              onClick={() => handleAsk(s)}
              className="block w-full text-left px-3 py-2 text-sm text-warm-700 hover:bg-warm-100 rounded-lg border border-warm-200"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {error && <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{error}</div>}

      {answer && (
        <div className="bg-white border border-warm-200 rounded-xl p-5 space-y-4">
          <div className="prose prose-sm max-w-none text-warm-900 whitespace-pre-wrap">{answer}</div>
          {sources.length > 0 && (
            <div className="pt-4 border-t border-warm-100">
              <p className="text-xs text-warm-500 uppercase tracking-wide mb-2">Reuniones citadas</p>
              <div className="space-y-2">
                {sources.map((s, i) => (
                  <Link
                    key={s.id}
                    href={`/meeting/${s.id}`}
                    className="block px-3 py-2 text-sm hover:bg-warm-50 rounded-lg border border-warm-200"
                  >
                    <span className="text-warm-500 mr-2">[Reunión {i + 1}]</span>
                    <span className="font-medium text-warm-900">{s.title}</span>
                    <span className="text-warm-500 ml-2">· {s.meeting_date}{s.threadName ? ` · ${s.threadName}` : ''}</span>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
