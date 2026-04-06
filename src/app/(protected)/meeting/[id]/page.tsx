'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { Meeting, MeetingType, MEETING_TYPE_LABELS, MEETING_TYPE_COLORS, Contact, TOPICS, TOPIC_LABELS } from '@/types'
import ContactSelector from '@/components/ContactSelector'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import Link from 'next/link'
import SchoolLogo from '@/components/SchoolLogo'

interface HistoryData {
  meeting: { id: string; title: string; meeting_date: string; participants: string | null; ai_summary: string | null }
  pendingActions: { id: string; text: string }[]
  unresolvedQuestions: string[]
  commitments: string[]
  totalPrevious: number
}

export default function MeetingDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const searchParams = useSearchParams()
  const isNew = searchParams.get('new') === '1'
  const isOnboarding = searchParams.get('onboarding') === '1'
  const threadId = searchParams.get('thread')

  const [meeting, setMeeting] = useState<Meeting | null>(null)
  const [history, setHistory] = useState<HistoryData | null>(null)
  const [loading, setLoading] = useState(true)
  const [aiLoading, setAiLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState<'calendar' | 'drive' | null>(null)
  const [toast, setToast] = useState('')
  const [historyExpanded, setHistoryExpanded] = useState(true)
  const [showEdit, setShowEdit] = useState(false)

  const fetchMeeting = async () => {
    const res = await fetch(`/api/meetings/${id}`)
    if (res.ok) setMeeting(await res.json())
    setLoading(false)
  }

  const fetchHistory = async () => {
    const res = await fetch(`/api/meetings/${id}/history`)
    if (res.ok) {
      const data = await res.json()
      setHistory(data)
    }
  }

  useEffect(() => {
    fetchMeeting()
    fetchHistory()
  }, [id])

  // Poll for AI results if new and not yet generated (max 20 attempts = ~60s)
  useEffect(() => {
    if (!isNew || !meeting || meeting.ai_questions) return
    let attempts = 0
    const interval = setInterval(async () => {
      attempts++
      if (attempts >= 20) { clearInterval(interval); setAiLoading(false); showToast('La IA está tardando más de lo esperado. Podés regenerar manualmente.'); return }
      const res = await fetch(`/api/meetings/${id}`)
      if (res.ok) {
        const data = await res.json()
        if (data.ai_questions) { setMeeting(data); clearInterval(interval) }
      }
    }, 3000)
    return () => clearInterval(interval)
  }, [isNew, meeting, id])

  const generateAI = async () => {
    setAiLoading(true)
    try {
      const res = await fetch('/api/ai/generate', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ meetingId: id }),
      })
      if (!res.ok) showToast('Error generando la guía. Intentá de nuevo.')
      await fetchMeeting()
    } catch {
      showToast('Error de conexión. Verificá tu internet.')
    }
    setAiLoading(false)
  }

  const handleGoogle = async (action: 'calendar' | 'drive') => {
    setGoogleLoading(action)
    try {
      const res = await fetch('/api/google', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ meetingId: id, action }),
      })
      const data = await res.json()
      await fetchMeeting()
      if (action === 'calendar') {
        data.calendar?.success
          ? showToast('Evento creado en Google Calendar')
          : showToast(data.calendar?.error ?? 'Error creando el evento de Calendar')
      }
      if (action === 'drive') {
        data.drive?.success
          ? showToast(`Guardado en Drive · ${data.drive.folder}`)
          : showToast(data.drive?.error ?? 'Error guardando en Drive')
      }
    } catch {
      showToast('Error de conexión. Verificá tu internet.')
    }
    setGoogleLoading(null)
  }

  const toggleAction = async (actionId: string, done: boolean) => {
    await fetch(`/api/meetings/${id}/actions/${actionId}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ done: !done }),
    })
    fetchMeeting()
  }

  const updateAssignedTo = async (actionId: string, assigned_to: string) => {
    await fetch(`/api/meetings/${id}/actions/${actionId}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ assigned_to: assigned_to.trim() || null }),
    })
    fetchMeeting()
  }

  const updateActionText = async (actionId: string, text: string) => {
    if (!text.trim()) return
    await fetch(`/api/meetings/${id}/actions/${actionId}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: text.trim() }),
    })
    fetchMeeting()
  }

  const addAction = async (text: string) => {
    if (!text.trim()) return
    await fetch(`/api/meetings/${id}/actions`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: text.trim() }),
    })
    fetchMeeting()
  }

  const deleteAction = async (actionId: string) => {
    await fetch(`/api/meetings/${id}/actions/${actionId}`, { method: 'DELETE' })
    fetchMeeting()
  }

  const resolveQuestion = async (index: number) => {
    if (!meeting?.ai_questions) return
    const updated = meeting.ai_questions.filter((_, i) => i !== index)
    await fetch(`/api/meetings/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ai_questions: updated.length ? updated : null }),
    })
    fetchMeeting()
  }

  const deleteMeeting = async () => {
    if (!confirm('¿Eliminar esta reunión? Esta acción no se puede deshacer.')) return
    const res = await fetch(`/api/meetings/${id}`, { method: 'DELETE' })
    if (!res.ok) { showToast('Error eliminando la reunión.'); return }
    router.push(meeting?.thread_id ? `/thread/${meeting.thread_id}` : '/dashboard')
  }

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(''), 3500)
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-warm-300 border-t-brand rounded-full animate-spin" />
    </div>
  )
  if (!meeting) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-warm-500">Reunión no encontrada.</p>
    </div>
  )

  const hasAI = !!meeting.ai_questions
  const hasHistory = !!history
  const pendingCount = (history?.pendingActions?.length ?? 0) + (history?.commitments?.length ?? 0)

  return (
    <div className="min-h-screen bg-white">
      {/* Toast */}
      {toast && (
        <div className="fixed bottom-16 left-1/2 -translate-x-1/2 bg-brand text-white text-sm px-5 py-3 rounded-xl z-50 shadow-lg">
          {toast}
        </div>
      )}

      {/* Header */}
      <header className="bg-white border-b border-warm-200 px-4 sm:px-6 py-3 sm:py-4">
        <div className="max-w-2xl mx-auto flex items-center gap-2 sm:gap-4">
          <button onClick={() => {
            if (meeting.thread_id) router.push(`/thread/${meeting.thread_id}`)
            else router.push('/dashboard')
          }} className="text-warm-400 hover:text-warm-600 flex-shrink-0">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="hidden sm:block"><SchoolLogo /></div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-sm sm:text-base font-medium text-warm-900 truncate">{meeting.title}</h1>
              <span className={`text-[10px] sm:text-xs px-1.5 sm:px-3 py-0.5 sm:py-1 rounded-full border flex-shrink-0 ${MEETING_TYPE_COLORS[meeting.type]}`}>
                {MEETING_TYPE_LABELS[meeting.type]}
              </span>
            </div>
            <p className="text-[11px] sm:text-xs text-warm-500">
              {format(parseISO(meeting.meeting_date), "d 'de' MMMM yyyy", { locale: es })}
            </p>
          </div>
          <div className="flex items-center gap-0.5 sm:gap-1 flex-shrink-0">
            <button onClick={() => setShowEdit(true)}
              className="text-warm-400 hover:text-warm-700 p-1.5 sm:p-2 rounded-lg hover:bg-warm-100 transition-colors"
              title="Editar reunión">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
            <button onClick={deleteMeeting}
              className="text-warm-400 hover:text-brand-700 p-1.5 sm:p-2 rounded-lg hover:bg-brand-50 transition-colors"
              title="Eliminar reunión">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-6 sm:py-8 pb-32 space-y-5">

        {/* Banner onboarding */}
        {isOnboarding && hasAI && (
          <div className="bg-brand-50 border border-green-200 rounded-xl p-4">
            <p className="text-sm text-green-800 font-medium mb-1">Tu primera reunión está lista</p>
            <p className="text-sm text-green-700">
              La IA generó el seguimiento automáticamente. Así vas a ver cada reunión que registres.
              <Link href="/dashboard" className="underline ml-1">Ir al dashboard →</Link>
            </p>
          </div>
        )}

        {/* Banner IA generando */}
        {isNew && !hasAI && (
          <div className="bg-brand-50 border border-blue-200 rounded-xl p-4 flex items-center gap-3">
            <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin flex-shrink-0" />
            <p className="text-sm text-brand">Generando guía de seguimiento con IA...</p>
          </div>
        )}

        {/* ─── HISTORIAL — panel principal ──────────────────── */}
        {hasHistory && (
          <div className="bg-white rounded-xl border border-amber-200 overflow-hidden">
            <button
              onClick={() => setHistoryExpanded(!historyExpanded)}
              className="w-full flex items-center justify-between px-5 py-4 hover:bg-brand-50 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-brand-50 rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg className="w-4 h-4 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="text-left">
                  <p className="text-sm font-medium text-warm-900">
                    Reunión anterior con este grupo
                  </p>
                  <p className="text-xs text-warm-500">
                    {format(parseISO(history.meeting.meeting_date), "d 'de' MMMM yyyy", { locale: es })}
                    {history.totalPrevious > 1 && ` · ${history.totalPrevious} reuniones anteriores`}
                    {pendingCount > 0 && ` · ${pendingCount} pendiente${pendingCount > 1 ? 's' : ''}`}
                  </p>
                </div>
              </div>
              <svg className={`w-4 h-4 text-warm-400 transition-transform ${historyExpanded ? 'rotate-180' : ''}`}
                fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {historyExpanded && (
              <div className="border-t border-amber-100 px-5 pb-5 pt-4 space-y-4">

                {/* Resumen de la anterior */}
                {history.meeting.ai_summary && (
                  <div>
                    <p className="text-xs text-warm-400 uppercase tracking-wide mb-1.5">Resumen de esa reunión</p>
                    <p className="text-sm text-warm-600 leading-relaxed">{history.meeting.ai_summary}</p>
                  </div>
                )}

                {/* Preguntas que quedaron sin cerrar */}
                {history.unresolvedQuestions.length > 0 && (
                  <div>
                    <p className="text-xs text-warm-400 uppercase tracking-wide mb-2">
                      Preguntas de seguimiento de esa reunión
                    </p>
                    <div className="space-y-2">
                      {history.unresolvedQuestions.map((q, i) => (
                        <div key={i} className="flex gap-2 items-start">
                          <span className="w-5 h-5 bg-amber-100 text-brand-700 rounded-full text-xs font-medium flex items-center justify-center flex-shrink-0 mt-0.5">
                            {i + 1}
                          </span>
                          <p className="text-sm text-warm-700 leading-relaxed">{q}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Acciones pendientes sin completar */}
                {history.pendingActions.length > 0 && (
                  <div>
                    <p className="text-xs text-warm-400 uppercase tracking-wide mb-2">
                      Acciones que quedaron pendientes
                    </p>
                    <div className="space-y-2">
                      {history.pendingActions.map((a) => (
                        <div key={a.id} className="flex gap-2 items-center">
                          <div className="w-4 h-4 rounded border-2 border-amber-300 flex-shrink-0" />
                          <p className="text-sm text-warm-700">{a.text}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Compromisos */}
                {history.commitments.length > 0 && (
                  <div>
                    <p className="text-xs text-warm-400 uppercase tracking-wide mb-2">Compromisos asumidos</p>
                    <div className="space-y-1.5">
                      {history.commitments.map((c, i) => (
                        <div key={i} className="flex gap-2 items-start text-sm text-warm-700">
                          <span className="text-amber-400 mt-0.5">·</span>
                          {c}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <Link href={`/meeting/${history.meeting.id}`}
                  className="text-xs text-amber-600 hover:underline block pt-1">
                  Ver reunión completa del {format(parseISO(history.meeting.meeting_date), "d 'de' MMMM", { locale: es })} →
                </Link>
              </div>
            )}
          </div>
        )}

        {/* Info básica */}
        <div className="bg-white rounded-xl border border-warm-200 p-5 space-y-3">
          {meeting.participants && (
            <div>
              <p className="text-xs text-warm-400 uppercase tracking-wide mb-0.5">Participantes</p>
              <p className="text-sm text-warm-700">{meeting.participants}</p>
            </div>
          )}
          {meeting.next_date && (
            <div>
              <p className="text-xs text-warm-400 uppercase tracking-wide mb-0.5">Próxima reunión</p>
              <p className="text-sm text-warm-700">
                {format(parseISO(meeting.next_date), "d 'de' MMMM yyyy", { locale: es })}
                {meeting.next_time && ` · ${meeting.next_time.slice(0,5)}`}
                {meeting.next_duration && ` · ${meeting.next_duration} min`}
              </p>
            </div>
          )}
          <div>
            <p className="text-xs text-warm-400 uppercase tracking-wide mb-0.5">Notas</p>
            <p className="text-sm text-warm-700 leading-relaxed whitespace-pre-line">{meeting.notes}</p>
          </div>
        </div>

        {/* IA — Seguimiento de esta reunión */}
        {hasAI ? (
          <div className="bg-white rounded-xl border border-warm-200 p-5 space-y-5">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-brand flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <h2 className="text-sm font-medium text-warm-900">Guía de seguimiento</h2>
            </div>

            {meeting.ai_summary && (
              <div>
                <p className="text-xs text-warm-400 uppercase tracking-wide mb-1.5">Resumen</p>
                <p className="text-sm text-warm-700 leading-relaxed">{meeting.ai_summary}</p>
              </div>
            )}

            {meeting.ai_questions?.length ? (
              <div>
                <p className="text-xs text-warm-400 uppercase tracking-wide mb-2">Preguntas para la próxima reunión</p>
                <ol className="space-y-2">
                  {meeting.ai_questions.map((q, i) => (
                    <li key={i} className="flex gap-3 text-sm text-warm-700 group">
                      <span className="w-5 h-5 bg-brand-50 text-brand rounded-full text-xs font-medium flex items-center justify-center flex-shrink-0 mt-0.5">
                        {i + 1}
                      </span>
                      <span className="flex-1">{q}</span>
                      <button onClick={() => resolveQuestion(i)}
                        className="opacity-0 group-hover:opacity-100 text-xs text-warm-400 hover:text-brand transition-all flex-shrink-0"
                        title="Marcar como resuelta">
                        Resuelta
                      </button>
                    </li>
                  ))}
                </ol>
              </div>
            ) : null}

            {meeting.ai_commitments?.length && (
              <div>
                <p className="text-xs text-warm-400 uppercase tracking-wide mb-2">Compromisos pendientes</p>
                <ul className="space-y-1.5">
                  {meeting.ai_commitments.map((c, i) => (
                    <li key={i} className="text-sm text-warm-700 flex gap-2">
                      <span className="text-warm-300 mt-0.5">·</span>{c}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div>
              <p className="text-xs text-warm-400 uppercase tracking-wide mb-2">Acciones</p>
              {meeting.actions?.length ? (
                <ul className="space-y-3 mb-3">
                  {meeting.actions.map((a) => (
                    <li key={a.id} className="flex items-start gap-3 group">
                      <button onClick={() => toggleAction(a.id, a.done)}
                        className={`w-4 h-4 mt-0.5 rounded border flex items-center justify-center flex-shrink-0 transition-colors ${
                          a.done ? 'bg-brand border-brand' : 'border-warm-300 hover:border-warm-500'
                        }`}>
                        {a.done && <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7"/>
                        </svg>}
                      </button>
                      <div className="flex-1 min-w-0">
                        <input
                          type="text"
                          defaultValue={a.text}
                          onBlur={e => { if (e.target.value !== a.text) updateActionText(a.id, e.target.value) }}
                          className={`text-sm w-full bg-transparent border-0 p-0 focus:ring-0 ${a.done ? 'line-through text-warm-400' : 'text-warm-700'}`}
                        />
                        <input
                          type="text"
                          defaultValue={a.assigned_to ?? ''}
                          onBlur={e => { if (e.target.value !== (a.assigned_to ?? '')) updateAssignedTo(a.id, e.target.value) }}
                          placeholder="Responsable..."
                          className="mt-1 text-xs text-warm-500 border-0 border-b border-dashed border-warm-200 focus:border-warm-400 focus:ring-0 bg-transparent w-full px-0 py-0.5 placeholder-warm-300"
                        />
                      </div>
                      <button onClick={() => deleteAction(a.id)}
                        className="opacity-0 group-hover:opacity-100 text-warm-300 hover:text-brand-700 transition-all flex-shrink-0 mt-0.5"
                        title="Eliminar acción">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
              <form onSubmit={e => { e.preventDefault(); const input = e.currentTarget.elements.namedItem('newAction') as HTMLInputElement; addAction(input.value); input.value = '' }}
                className="flex gap-2">
                <input name="newAction" type="text" placeholder="Agregar acción..."
                  className="flex-1 text-sm border-0 border-b border-dashed border-warm-200 focus:border-warm-400 focus:ring-0 bg-transparent px-0 py-1 placeholder-warm-300" />
                <button type="submit" className="text-xs text-brand hover:text-brand-700 font-medium flex-shrink-0">+ Agregar</button>
              </form>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-warm-200 p-5 space-y-5">
            <div className="text-center">
              <p className="text-sm text-warm-500 mb-4">Todavía no se generó la guía de seguimiento.</p>
              <button onClick={generateAI} disabled={aiLoading}
                className="text-sm bg-brand text-white px-5 py-2.5 rounded-lg disabled:opacity-50">
                {aiLoading ? 'Generando...' : 'Generar con IA'}
              </button>
            </div>
            {/* Acciones manuales aún sin IA */}
            <div>
              <p className="text-xs text-warm-400 uppercase tracking-wide mb-2">Acciones</p>
              {meeting.actions?.length ? (
                <ul className="space-y-3 mb-3">
                  {meeting.actions.map((a) => (
                    <li key={a.id} className="flex items-start gap-3 group">
                      <button onClick={() => toggleAction(a.id, a.done)}
                        className={`w-4 h-4 mt-0.5 rounded border flex items-center justify-center flex-shrink-0 transition-colors ${
                          a.done ? 'bg-brand border-brand' : 'border-warm-300 hover:border-warm-500'
                        }`}>
                        {a.done && <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7"/>
                        </svg>}
                      </button>
                      <div className="flex-1 min-w-0">
                        <input type="text" defaultValue={a.text}
                          onBlur={e => { if (e.target.value !== a.text) updateActionText(a.id, e.target.value) }}
                          className={`text-sm w-full bg-transparent border-0 p-0 focus:ring-0 ${a.done ? 'line-through text-warm-400' : 'text-warm-700'}`} />
                        <input type="text" defaultValue={a.assigned_to ?? ''}
                          onBlur={e => { if (e.target.value !== (a.assigned_to ?? '')) updateAssignedTo(a.id, e.target.value) }}
                          placeholder="Responsable..."
                          className="mt-1 text-xs text-warm-500 border-0 border-b border-dashed border-warm-200 focus:border-warm-400 focus:ring-0 bg-transparent w-full px-0 py-0.5 placeholder-warm-300" />
                      </div>
                      <button onClick={() => deleteAction(a.id)}
                        className="opacity-0 group-hover:opacity-100 text-warm-300 hover:text-brand-700 transition-all flex-shrink-0 mt-0.5"
                        title="Eliminar acción">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
              <form onSubmit={e => { e.preventDefault(); const input = e.currentTarget.elements.namedItem('newActionNoAi') as HTMLInputElement; addAction(input.value); input.value = '' }}
                className="flex gap-2">
                <input name="newActionNoAi" type="text" placeholder="Agregar acción..."
                  className="flex-1 text-sm border-0 border-b border-dashed border-warm-200 focus:border-warm-400 focus:ring-0 bg-transparent px-0 py-1 placeholder-warm-300" />
                <button type="submit" className="text-xs text-brand hover:text-brand-700 font-medium flex-shrink-0">+ Agregar</button>
              </form>
            </div>
          </div>
        )}

        {/* Integraciones Google */}
        <div className="bg-white rounded-xl border border-warm-200 p-5">
          <h2 className="text-sm font-medium text-warm-900 mb-4">Integraciones Google</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button onClick={() => handleGoogle('calendar')}
              disabled={!!googleLoading || !!aiLoading || !meeting.next_date}
              className="flex items-center gap-2 px-4 py-3 border border-warm-200 rounded-xl text-sm text-warm-700 hover:bg-warm-50 disabled:opacity-40 transition-colors">
              <svg className="w-4 h-4 text-brand flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              {googleLoading === 'calendar' ? 'Agendando...' : meeting.calendar_event_id ? '✓ Agendado' : 'Agendar aviso'}
            </button>
            <button onClick={() => handleGoogle('drive')}
              disabled={!!googleLoading || !!aiLoading}
              className="flex items-center gap-2 px-4 py-3 border border-warm-200 rounded-xl text-sm text-warm-700 hover:bg-warm-50 disabled:opacity-40 transition-colors">
              <svg className="w-4 h-4 text-brand flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              {googleLoading === 'drive' ? 'Guardando...' : meeting.drive_doc_url ? '✓ En Drive' : 'Guardar en Drive'}
            </button>
          </div>
          {!meeting.next_date && (
            <p className="text-xs text-warm-400 mt-2">
              Definí una próxima reunión para habilitar el aviso de Calendar.
            </p>
          )}
          {meeting.drive_doc_url && (
            <a href={meeting.drive_doc_url} target="_blank" rel="noopener noreferrer"
              className="text-xs text-brand hover:underline mt-2 block">
              Abrir documento en Drive →
            </a>
          )}
        </div>

      </main>

      {showEdit && (
        <EditMeetingModal
          meeting={meeting}
          onClose={() => setShowEdit(false)}
          onSaved={(updated) => { setMeeting(updated); setShowEdit(false); showToast('Reunión actualizada') }}
        />
      )}
    </div>
  )
}

// ─── Modal de edición ─────────────────────────────────────────────────────────

interface ThreadOption { id: string; name: string; type: MeetingType; participants: string | null }

function EditMeetingModal({ meeting, onClose, onSaved }: {
  meeting: Meeting
  onClose: () => void
  onSaved: (updated: Meeting) => void
}) {
  const DURATIONS = [30, 45, 60, 90, 120]
  const formatDuration = (d: number) => d < 60 ? `${d} min` : `${Math.floor(d / 60)}h${d % 60 ? ` ${d % 60}min` : ''}`

  const [title, setTitle] = useState(meeting.title)
  const [type, setType] = useState<MeetingType>(meeting.type)
  const [notes, setNotes] = useState(meeting.notes)
  const [meetingDate, setMeetingDate] = useState(meeting.meeting_date)
  const [nextDate, setNextDate] = useState(meeting.next_date ?? '')
  const [nextTime, setNextTime] = useState(meeting.next_time ?? '09:00')
  const [nextDuration, setNextDuration] = useState(meeting.next_duration ?? 60)
  const [course, setCourse] = useState(meeting.course ?? '')
  const [subject, setSubject] = useState(meeting.subject ?? '')
  const [academicYear, setAcademicYear] = useState(meeting.academic_year ? String(meeting.academic_year) : '')
  const [tagsInput, setTagsInput] = useState((meeting.tags ?? []).join(', '))
  const [topic, setTopic] = useState(meeting.topic ?? '')
  const [selectedContacts, setSelectedContacts] = useState<Contact[]>(
    ((meeting as any).meeting_contacts as any[] ?? []).map((mc: any) => mc.contact).filter(Boolean)
  )

  // Selector de hilo
  const [threads, setThreads] = useState<ThreadOption[]>([])
  const [threadSearch, setThreadSearch] = useState('')
  const [selectedThreadId, setSelectedThreadId] = useState(meeting.thread_id ?? '')
  const [showDropdown, setShowDropdown] = useState(false)

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/threads').then(r => r.json()).then(data => {
      if (Array.isArray(data)) {
        setThreads(data)
        if (meeting.thread_id) {
          const t = data.find((t: ThreadOption) => t.id === meeting.thread_id)
          if (t) setThreadSearch(t.name)
        }
      }
    }).catch(() => {})
  }, [meeting.thread_id])

  const selectedThread = threads.find(t => t.id === selectedThreadId)
  const filteredThreads = threads.filter(t =>
    t.name.toLowerCase().includes(threadSearch.toLowerCase())
  )

  const selectThread = (t: ThreadOption) => {
    setSelectedThreadId(t.id); setThreadSearch(t.name); setShowDropdown(false)
  }
  const clearThread = () => {
    setSelectedThreadId(''); setThreadSearch(''); setShowDropdown(false)
  }

  const handleSave = async () => {
    if (!title.trim()) { setError('El nombre es requerido.'); return }
    setSaving(true); setError('')
    const res = await fetch(`/api/meetings/${meeting.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: title.trim(),
        type,
        notes: notes.trim(),
        meeting_date: meetingDate,
        next_date: nextDate || null,
        next_time: nextDate ? nextTime : null,
        next_duration: nextDate ? nextDuration : null,
        thread_id: selectedThreadId || null,
        course: course.trim() || null,
        subject: subject.trim() || null,
        academic_year: academicYear ? Number(academicYear) : null,
        tags: tagsInput.trim() ? tagsInput.split(',').map(t => t.trim()).filter(Boolean) : null,
        topic: topic || null,
        contact_ids: selectedContacts.map(c => c.id),
      }),
    })
    setSaving(false)
    if (!res.ok) { setError('Error guardando los cambios.'); return }
    onSaved(await res.json())
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 50, overflowY: 'auto', padding: '1rem' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="bg-white rounded-2xl border border-warm-200 w-full max-w-lg mx-auto my-4 sm:my-8 p-4 sm:p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-medium text-warm-900">Editar reunión</h2>
          <button onClick={onClose} className="text-warm-400 hover:text-warm-600">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-4">
          {/* Título y fecha */}
          <div>
            <label className="text-xs font-medium text-warm-500 uppercase tracking-wide block mb-1.5">Nombre de la reunión *</label>
            <input type="text" value={title} onChange={e => setTitle(e.target.value)} className="w-full text-sm" />
          </div>
          <div>
            <label className="text-xs font-medium text-warm-500 uppercase tracking-wide block mb-1.5">Tipo de reunión</label>
            <div className="flex flex-wrap gap-1.5">
              {(['docentes', 'padres', 'individual', 'direccion'] as MeetingType[]).map(t => (
                <button key={t} type="button" onClick={() => setType(t)}
                  className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                    type === t ? 'bg-brand text-white border-brand' : 'border-warm-200 text-warm-600 hover:border-warm-300'
                  }`}>
                  {MEETING_TYPE_LABELS[t]}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-warm-500 uppercase tracking-wide block mb-1.5">Fecha</label>
            <input type="date" value={meetingDate} onChange={e => setMeetingDate(e.target.value)} className="w-full text-sm" />
          </div>
          <div>
            <label className="text-xs font-medium text-warm-500 uppercase tracking-wide block mb-1.5">Participantes</label>
            <ContactSelector selected={selectedContacts} onChange={setSelectedContacts} />
          </div>

          {/* Notas */}
          <div>
            <label className="text-xs font-medium text-warm-500 uppercase tracking-wide block mb-1.5">Notas / Minuta</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)}
              rows={5} className="w-full text-sm leading-relaxed" />
          </div>

          {/* Hilo */}
          <div>
            <label className="text-xs font-medium text-warm-500 uppercase tracking-wide block mb-1.5">Hilo de seguimiento</label>
            <div className="relative">
              <div className={`flex items-center gap-2 border rounded-lg px-3 py-2 transition-colors ${showDropdown ? 'border-blue-400 ring-2 ring-blue-100' : 'border-warm-200'}`}>
                {selectedThread && (
                  <span className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 ${
                    selectedThread.type === 'docentes' ? 'bg-brand-50 text-brand' :
                    selectedThread.type === 'padres' ? 'bg-brand-50 text-green-700' :
                    selectedThread.type === 'individual' ? 'bg-brand-50 text-brand-700' : 'bg-warm-100 text-warm-600'
                  }`}>{MEETING_TYPE_LABELS[selectedThread.type]}</span>
                )}
                <input type="text" value={threadSearch}
                  onChange={e => { setThreadSearch(e.target.value); setShowDropdown(true); if (!e.target.value) clearThread() }}
                  onFocus={() => setShowDropdown(true)}
                  placeholder="Sin hilo (reunión suelta)"
                  className="flex-1 text-sm border-none outline-none bg-transparent p-0 focus:ring-0"
                  style={{ boxShadow: 'none' }} />
                {selectedThreadId && (
                  <button onClick={clearThread} className="text-warm-400 hover:text-warm-600 flex-shrink-0">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
              {showDropdown && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-warm-200 rounded-xl shadow-lg z-10 max-h-40 overflow-y-auto">
                  {filteredThreads.length === 0
                    ? <div className="px-4 py-3 text-sm text-warm-500">No hay hilos que coincidan</div>
                    : filteredThreads.map(t => (
                        <button key={t.id} onClick={() => selectThread(t)}
                          className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-warm-50 text-left text-sm text-warm-900 border-b border-warm-50 last:border-0">
                          <span className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 ${
                            t.type === 'docentes' ? 'bg-brand-50 text-brand' :
                            t.type === 'padres' ? 'bg-brand-50 text-green-700' :
                            t.type === 'individual' ? 'bg-brand-50 text-brand-700' : 'bg-warm-100 text-warm-600'
                          }`}>{MEETING_TYPE_LABELS[t.type]}</span>
                          {t.name}
                        </button>
                      ))
                  }
                </div>
              )}
            </div>
          </div>

          {/* Próxima reunión */}
          <div>
            <label className="text-xs font-medium text-warm-500 uppercase tracking-wide block mb-1.5">Próxima reunión</label>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-xs text-warm-400 block mb-1">Fecha</label>
                <input type="date" value={nextDate} onChange={e => setNextDate(e.target.value)} className="w-full text-sm" />
              </div>
              <div>
                <label className="text-xs text-warm-400 block mb-1">Hora</label>
                <input type="time" value={nextTime} onChange={e => setNextTime(e.target.value)} className="w-full text-sm" disabled={!nextDate} />
              </div>
              <div>
                <label className="text-xs text-warm-400 block mb-1">Duración</label>
                <select value={nextDuration} onChange={e => setNextDuration(Number(e.target.value))} className="w-full text-sm" disabled={!nextDate}>
                  {DURATIONS.map(d => <option key={d} value={d}>{formatDuration(d)}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* Clasificación */}
          <div>
            <label className="text-xs font-medium text-warm-500 uppercase tracking-wide block mb-2">Clasificación</label>
            <div className="mb-3">
              <label className="text-xs text-warm-400 block mb-1.5">Tema</label>
              <div className="flex flex-wrap gap-1.5">
                {TOPICS.map(t => (
                  <button key={t} type="button" onClick={() => setTopic(topic === t ? '' : t)}
                    className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                      topic === t ? 'bg-brand text-white border-brand' : 'border-warm-200 text-warm-600 hover:border-warm-300'
                    }`}>
                    {TOPIC_LABELS[t as keyof typeof TOPIC_LABELS]}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-warm-400 block mb-1">Curso</label>
                <input type="text" value={course} onChange={e => setCourse(e.target.value)} placeholder="Ej: 3ro A" className="w-full text-sm" />
              </div>
              <div>
                <label className="text-xs text-warm-400 block mb-1">Materia</label>
                <input type="text" value={subject} onChange={e => setSubject(e.target.value)} placeholder="Ej: Matemáticas" className="w-full text-sm" />
              </div>
              <div>
                <label className="text-xs text-warm-400 block mb-1">Año lectivo</label>
                <input type="number" value={academicYear} onChange={e => setAcademicYear(e.target.value)} placeholder={String(new Date().getFullYear())} min={2020} max={2040} className="w-full text-sm" />
              </div>
              <div>
                <label className="text-xs text-warm-400 block mb-1">Etiquetas</label>
                <input type="text" value={tagsInput} onChange={e => setTagsInput(e.target.value)} placeholder="urgente, familia" className="w-full text-sm" />
              </div>
            </div>
          </div>
        </div>

        {error && <p className="text-sm text-brand-700 mt-3">{error}</p>}

        <div className="flex gap-3 mt-6">
          <button onClick={handleSave} disabled={saving}
            className="flex-1 bg-brand text-white text-sm py-3 rounded-xl font-medium hover:bg-brand-600 transition-colors disabled:opacity-50">
            {saving ? 'Guardando...' : 'Guardar cambios'}
          </button>
          <button onClick={onClose} className="px-4 py-3 text-sm text-warm-600 border border-warm-200 rounded-xl hover:bg-warm-50">
            Cancelar
          </button>
        </div>
      </div>
    </div>
  )
}
