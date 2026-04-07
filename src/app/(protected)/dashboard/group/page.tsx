'use client'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Meeting, MEETING_TYPE_LABELS, MEETING_TYPE_DOT } from '@/types'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import Link from 'next/link'
import SchoolLogo from '@/components/SchoolLogo'

interface SchoolSummary {
  id: string
  name: string
  meetings: Meeting[]
}

export default function GroupDashboard() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [schools, setSchools] = useState<SchoolSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedSchool, setSelectedSchool] = useState<string>('all')

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/auth')
    if (session?.user?.role !== 'owner' && status === 'authenticated') {
      router.push('/dashboard')
    }
  }, [status, session, router])

  useEffect(() => {
    if (!session) return
    fetch('/api/group/schools')
      .then((r) => r.json())
      .then((data) => { setSchools(Array.isArray(data) ? data : []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [session])

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-warm-300 border-t-brand rounded-full animate-spin" />
    </div>
  )

  const allMeetings = schools.flatMap((s) =>
    s.meetings.map((m) => ({ ...m, school: { id: s.id, name: s.name } }))
  ).sort((a, b) => b.meeting_date.localeCompare(a.meeting_date))

  const filtered = selectedSchool === 'all'
    ? allMeetings
    : allMeetings.filter((m) => m.school_id === selectedSchool)

  const totalAI = allMeetings.filter((m) => m.ai_questions).length
  const pendingAI = allMeetings.filter((m) => !m.ai_questions).length

  return (
    <div className="min-h-screen bg-warm-50">
      <header className="bg-white border-b border-warm-200 px-4 sm:px-6 py-3 sm:py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="hidden sm:block"><SchoolLogo /></div>
            <div className="min-w-0">
              <h1 className="text-sm sm:text-base font-medium text-warm-900">Panel del grupo</h1>
              <p className="text-[11px] sm:text-xs text-warm-500 mt-0.5 truncate">
                {session?.user?.school?.group_name ?? 'Grupo de escuelas'}
              </p>
            </div>
          </div>
          <Link href="/dashboard" className="text-xs sm:text-sm text-warm-500 hover:text-warm-700 flex-shrink-0">
            Mi escuela →
          </Link>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8 pb-8">

        {/* Stats generales */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-8">
          {[
            { label: 'Escuelas', value: schools.length },
            { label: 'Reuniones totales', value: allMeetings.length },
            { label: 'Con seguimiento IA', value: totalAI },
            { label: 'Sin procesar', value: pendingAI },
          ].map((s) => (
            <div key={s.label} className="bg-white rounded-xl border border-warm-200 p-4">
              <p className="text-xs text-warm-500 mb-1">{s.label}</p>
              <p className="text-2xl font-medium text-warm-900">{s.value}</p>
            </div>
          ))}
        </div>

        {/* Selector de escuela */}
        <div className="flex gap-2 flex-wrap mb-6">
          <button
            onClick={() => setSelectedSchool('all')}
            className={`text-sm px-4 py-2 rounded-full border transition-colors ${
              selectedSchool === 'all'
                ? 'bg-brand text-white border-brand'
                : 'border-warm-200 text-warm-600 hover:border-warm-300'
            }`}>
            Todas las escuelas
          </button>
          {schools.map((s) => (
            <button key={s.id}
              onClick={() => setSelectedSchool(s.id)}
              className={`text-sm px-4 py-2 rounded-full border transition-colors ${
                selectedSchool === s.id
                  ? 'bg-brand text-white border-brand'
                  : 'border-warm-200 text-warm-600 hover:border-warm-300'
              }`}>
              {s.name}
            </button>
          ))}
        </div>

        {/* Lista de reuniones */}
        <div className="bg-white rounded-xl border border-warm-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-warm-100 flex items-center justify-between">
            <h2 className="text-sm font-medium text-warm-900">Reuniones</h2>
            <span className="text-xs text-warm-400">{filtered.length} reuniones</span>
          </div>

          {filtered.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-sm text-warm-500">No hay reuniones registradas.</p>
            </div>
          ) : (
            <div className="divide-y divide-warm-100">
              {filtered.map((m) => (
                <Link key={m.id} href={`/meeting/${m.id}`}
                  className="flex items-center gap-4 px-5 py-4 hover:bg-warm-50 transition-colors">
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${MEETING_TYPE_DOT[m.type]}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-warm-900 truncate">{m.title}</p>
                      <span className="text-xs text-warm-400 flex-shrink-0">{m.school?.name}</span>
                    </div>
                    <p className="text-xs text-warm-500 mt-0.5">
                      {MEETING_TYPE_LABELS[m.type]}
                      {m.participants ? ` · ${m.participants}` : ''}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs text-warm-500">
                      {format(parseISO(m.meeting_date), "d MMM", { locale: es })}
                    </p>
                    {m.ai_questions
                      ? <span className="text-xs text-brand">✓ IA lista</span>
                      : <span className="text-xs text-brand-400">Sin IA</span>}
                  </div>
                  <svg className="w-4 h-4 text-warm-300 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
