'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { MEETING_TYPE_LABELS, MEETING_TYPE_COLORS, MeetingType, Contact, TOPICS, TOPIC_LABELS } from '@/types'
import ContactSelector from '@/components/ContactSelector'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import Link from 'next/link'
import SchoolLogo from '@/components/SchoolLogo'

interface ThreadDetail {
  thread: {
    id: string; name: string; type: MeetingType
    participants: string | null; description: string | null
    last_meeting_at: string | null; archived: boolean
  }
  meetings: any[]
  lastMeeting: any | null
  pendingActions: any[]
  allActions: any[]
  openQuestions: string[]
}

interface PendingThread {
  id: string; name: string; type: MeetingType
  pendingActions: { id: string; text: string }[]
}

export default function ThreadPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [data, setData] = useState<ThreadDetail | null>(null)
  const [pendingThreads, setPendingThreads] = useState<PendingThread[]>([])
  const [loading, setLoading] = useState(true)
  const [showOthers, setShowOthers] = useState(false)
  const [showAllActions, setShowAllActions] = useState(false)
  const [sendingEmail, setSendingEmail] = useState(false)
  const [toast, setToast] = useState('')
  const [showEdit, setShowEdit] = useState(false)
  const [editingAssign, setEditingAssign] = useState<string | null>(null)
  const [assignValue, setAssignValue] = useState('')

  const saveAssignedTo = async (meetingId: string, actionId: string) => {
    await fetch(`/api/meetings/${meetingId}/actions/${actionId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ assigned_to: assignValue.trim() || null }),
    })
    setEditingAssign(null)
    fetchData()
  }

  const fetchData = async () => {
    const [threadRes, pendingRes] = await Promise.all([
      fetch(`/api/threads/${id}`),
      fetch(`/api/threads/pending?exclude=${id}`),
    ])
    if (threadRes.ok) setData(await threadRes.json())
    if (pendingRes.ok) setPendingThreads(await pendingRes.json())
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [id])

  const sendEmail = async () => {
    if (!confirm('¿Enviar la guía de seguimiento por email a los participantes?')) return
    setSendingEmail(true)
    const res = await fetch('/api/email/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ threadId: id }),
    })
    setSendingEmail(false)
    if (res.ok) showToast('Email enviado correctamente')
    else showToast('Error enviando el email. Verificá la configuración.')
  }

  const toggleAction = async (meetingId: string, actionId: string, done: boolean) => {
    await fetch(`/api/meetings/${meetingId}/actions/${actionId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ done: !done }),
    })
    fetchData()
  }

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000) }

  const toggleArchive = async () => {
    const isArchived = data?.thread.archived
    const msg = isArchived ? '¿Reactivar este hilo?' : '¿Archivar este hilo? Podés reactivarlo después.'
    if (!confirm(msg)) return
    const res = await fetch(`/api/threads/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ archived: !isArchived }),
    })
    if (!res.ok) { showToast(isArchived ? 'Error reactivando el hilo.' : 'Error archivando el hilo.'); return }
    if (isArchived) { fetchData(); showToast('Hilo reactivado') }
    else router.push('/dashboard')
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-warm-300 border-t-brand rounded-full animate-spin" />
    </div>
  )
  if (!data) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-warm-500">Hilo no encontrado.</p>
    </div>
  )

  const { thread, meetings, lastMeeting, pendingActions, allActions, openQuestions } = data
  const hasGuide = pendingActions.length > 0 || openQuestions.length > 0
  const lastMeetingContacts = (lastMeeting?.meeting_contacts ?? []).map((mc: any) => mc.contact).filter(Boolean)

  return (
    <div className="min-h-screen bg-white">
      {toast && (
        <div className="fixed bottom-16 left-1/2 -translate-x-1/2 bg-brand text-white text-sm px-5 py-3 rounded-xl z-50">
          {toast}
        </div>
      )}

      {/* Header */}
      <header className="bg-white border-b border-warm-200 px-4 sm:px-6 py-3 sm:py-4">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center gap-2 sm:gap-4">
            <button onClick={() => router.push('/dashboard')} className="text-warm-400 hover:text-warm-600 flex-shrink-0">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div className="hidden sm:block"><SchoolLogo /></div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-sm sm:text-base font-medium text-warm-900 truncate">{thread.name}</h1>
                <span className={`text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 rounded-full flex-shrink-0 border ${MEETING_TYPE_COLORS[thread.type]}`}>
                  {MEETING_TYPE_LABELS[thread.type]}
                </span>
              </div>
              {lastMeeting?.next_date ? (
                <p className="text-[11px] sm:text-xs text-brand mt-0.5 flex items-center gap-1">
                  <svg className="w-3 h-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span className="truncate">Próxima: {format(parseISO(lastMeeting.next_date), "EEEE d 'de' MMMM", { locale: es })}</span>
                </p>
              ) : (
                <p className="text-[11px] sm:text-xs text-warm-400 mt-0.5">Sin próxima reunión agendada</p>
              )}
            </div>
            {/* Icon + text buttons */}
            <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
              <button onClick={() => setShowEdit(true)}
                className="text-warm-400 hover:text-warm-700 p-1.5 sm:p-2 rounded-lg hover:bg-warm-100 transition-colors"
                title="Editar hilo">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>
              <button onClick={sendEmail} disabled={sendingEmail}
                className="hidden sm:inline-flex text-sm border border-warm-200 text-warm-600 px-3 py-2 rounded-lg hover:bg-warm-50 transition-colors disabled:opacity-50">
                {sendingEmail ? 'Enviando...' : '✉ Enviar guía'}
              </button>
              <Link href={`/meeting/new?thread=${id}`}
                className="hidden sm:inline-flex text-sm bg-brand text-white px-4 py-2 rounded-lg hover:bg-brand-600 transition-colors">
                + Nueva reunión
              </Link>
              <button onClick={toggleArchive} className="text-warm-400 hover:text-warm-600 p-1.5 sm:p-2 rounded-lg hover:bg-warm-100 transition-colors" title={data?.thread.archived ? 'Reactivar hilo' : 'Archivar hilo'}>
                {data?.thread.archived ? (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                  </svg>
                )}
              </button>
            </div>
          </div>
          {/* Action buttons - second row on mobile only */}
          <div className="flex items-center gap-2 mt-2 sm:hidden">
            <button onClick={sendEmail} disabled={sendingEmail}
              className="text-xs border border-warm-200 text-warm-600 px-2.5 py-1.5 rounded-lg hover:bg-warm-50 transition-colors disabled:opacity-50 flex-1">
              {sendingEmail ? 'Enviando...' : '✉ Enviar guía'}
            </button>
            <Link href={`/meeting/new?thread=${id}`}
              className="text-xs bg-brand text-white px-2.5 py-1.5 rounded-lg hover:bg-brand-600 transition-colors flex-1 text-center">
              + Nueva reunión
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-6 sm:py-8 pb-8 space-y-5">

        {/* Sin reuniones todavía */}
        {meetings.length === 0 && (
          <div className="bg-white rounded-xl border border-warm-200 p-8 text-center">
            <p className="text-sm font-medium text-warm-900 mb-1">No hay reuniones en este hilo todavía</p>
            <p className="text-sm text-warm-500 mb-5">Registrá la primera reunión para empezar a construir el historial de seguimiento.</p>
            <Link href={`/meeting/new?thread=${id}`}
              className="text-sm bg-brand text-white px-5 py-2.5 rounded-lg hover:bg-brand-600 transition-colors inline-block">
              Registrar primera reunión
            </Link>
          </div>
        )}

        {/* ─── GUÍA PARA LA PRÓXIMA REUNIÓN ───────────────── */}
        {hasGuide && lastMeeting && (
          <div className="bg-white rounded-xl border border-warm-200 overflow-hidden">
            {/* Header */}
            <div className="px-5 py-4 border-b border-warm-100 flex items-center gap-3">
              <svg className="w-4 h-4 text-brand flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <div>
                <h2 className="text-sm font-medium text-warm-900">Guía para la próxima reunión</h2>
                <p className="text-xs text-warm-500">
                  Basada en la reunión del {format(parseISO(lastMeeting.meeting_date), "d 'de' MMMM yyyy", { locale: es })}
                </p>
              </div>
            </div>

            <div className="px-5 pb-5 pt-4 space-y-5">

              {/* 1. CONTEXTO: resumen + participantes de la última reunión */}
              {(lastMeeting.ai_summary || lastMeetingContacts.length > 0) && (
                <div className="bg-warm-50 rounded-xl p-4 space-y-3">
                  {lastMeeting.ai_summary && (
                    <p className="text-sm text-warm-700 leading-relaxed">{lastMeeting.ai_summary}</p>
                  )}
                  {lastMeetingContacts.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {lastMeetingContacts.map((c: any) => (
                        <span key={c.id} className="inline-flex items-center text-xs bg-white border border-warm-200 text-warm-600 px-2.5 py-1 rounded-full">
                          {c.name}
                          {c.role && <span className="text-warm-400 ml-1">· {c.role}</span>}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* 2. ACCIONES PENDIENTES con checkbox */}
              {pendingActions.length > 0 && (
                <div>
                  <p className="text-xs text-warm-400 uppercase tracking-wide mb-2">
                    Pendientes ({pendingActions.length})
                  </p>
                  <div className="space-y-2.5">
                    {pendingActions.map((a) => (
                      <div key={a.id} className="flex items-start gap-3">
                        <button
                          onClick={() => toggleAction(a.meeting_id, a.id, a.done)}
                          className="w-4 h-4 mt-0.5 rounded border border-warm-300 hover:border-warm-500 flex items-center justify-center flex-shrink-0 transition-colors">
                        </button>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-warm-700">{a.text}</p>
                          {editingAssign === a.id ? (
                            <form onSubmit={(e) => { e.preventDefault(); saveAssignedTo(a.meeting_id, a.id) }} className="flex items-center gap-1 mt-0.5">
                              <input
                                autoFocus
                                value={assignValue}
                                onChange={(e) => setAssignValue(e.target.value)}
                                onBlur={() => saveAssignedTo(a.meeting_id, a.id)}
                                placeholder="Responsable..."
                                className="text-xs border border-warm-200 rounded px-1.5 py-0.5 w-40 focus:outline-none focus:border-blue-400"
                              />
                            </form>
                          ) : (
                            <button
                              onClick={() => { setEditingAssign(a.id); setAssignValue(a.assigned_to || '') }}
                              className="text-xs text-warm-400 mt-0.5 hover:text-brand transition-colors">
                              {a.assigned_to || '+ asignar'}
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 3. PREGUNTAS DE SEGUIMIENTO */}
              {openQuestions.length > 0 && (
                <div>
                  <p className="text-xs text-warm-400 uppercase tracking-wide mb-2">Preguntas para tratar</p>
                  <div className="space-y-2">
                    {openQuestions.map((q, i) => (
                      <div key={i} className="flex gap-3 items-start">
                        <span className="w-5 h-5 bg-brand-50 text-brand rounded-full text-xs font-medium flex items-center justify-center flex-shrink-0 mt-0.5">
                          {i + 1}
                        </span>
                        <p className="text-sm text-warm-700 leading-relaxed">{q}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ─── TODAS LAS ACCIONES ──────────────────────────── */}
        {allActions.length > 0 && (
          <div>
            <button onClick={() => setShowAllActions(!showAllActions)}
              className="w-full flex items-center justify-between text-left px-5 py-3.5 bg-white rounded-xl border border-warm-200 hover:bg-warm-50 transition-colors">
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-warm-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
                <span className="text-sm text-warm-700 font-medium">Historial de acciones</span>
                <span className="text-xs text-warm-400">
                  {allActions.filter(a => a.done).length}/{allActions.length} completadas
                </span>
              </div>
              <svg className={`w-4 h-4 text-warm-400 transition-transform ${showAllActions ? 'rotate-180' : ''}`}
                fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {showAllActions && (
              <div className="mt-2 bg-white rounded-xl border border-warm-200 overflow-hidden">
                {/* Agrupar por reunión */}
                {meetings.filter(m => (m.meeting_actions ?? []).length > 0).map((m) => (
                  <div key={m.id} className="border-b border-warm-100 last:border-0">
                    <div className="px-5 py-2.5 bg-warm-50 flex items-center justify-between">
                      <Link href={`/meeting/${m.id}`} className="text-xs font-medium text-warm-600 hover:text-warm-900">
                        {m.title} · {format(parseISO(m.meeting_date), "d MMM yyyy", { locale: es })}
                      </Link>
                      <span className="text-xs text-warm-400">
                        {(m.meeting_actions ?? []).filter((a: any) => a.done).length}/{(m.meeting_actions ?? []).length}
                      </span>
                    </div>
                    <div className="divide-y divide-warm-50">
                      {(m.meeting_actions ?? []).map((a: any) => (
                        <div key={a.id} className="flex items-start gap-3 px-5 py-3">
                          <button
                            onClick={() => toggleAction(m.id, a.id, a.done)}
                            className={`w-4 h-4 mt-0.5 rounded border flex items-center justify-center flex-shrink-0 transition-colors ${
                              a.done ? 'bg-brand border-brand' : 'border-warm-300 hover:border-warm-500'
                            }`}>
                            {a.done && <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7"/>
                            </svg>}
                          </button>
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm ${a.done ? 'line-through text-warm-400' : 'text-warm-700'}`}>{a.text}</p>
                            {editingAssign === a.id ? (
                              <form onSubmit={(e) => { e.preventDefault(); saveAssignedTo(m.id, a.id) }} className="flex items-center gap-1 mt-0.5">
                                <input
                                  autoFocus
                                  value={assignValue}
                                  onChange={(e) => setAssignValue(e.target.value)}
                                  onBlur={() => saveAssignedTo(m.id, a.id)}
                                  placeholder="Responsable..."
                                  className="text-xs border border-warm-200 rounded px-1.5 py-0.5 w-40 focus:outline-none focus:border-blue-400"
                                />
                              </form>
                            ) : (
                              <button
                                onClick={() => { setEditingAssign(a.id); setAssignValue(a.assigned_to || '') }}
                                className="text-xs text-warm-400 mt-0.5 hover:text-brand transition-colors">
                                {a.assigned_to || '+ asignar'}
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ─── OTROS HILOS CON PENDIENTES ─────────────────── */}
        {pendingThreads.length > 0 && (
          <div>
            <button onClick={() => setShowOthers(!showOthers)}
              className="w-full flex items-center justify-between text-left px-5 py-3 bg-white rounded-xl border border-warm-200 hover:bg-warm-50 transition-colors">
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-brand-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                <span className="text-sm text-warm-700">
                  Otros temas abiertos
                  <span className="text-xs text-warm-400 ml-2">
                    {pendingThreads.length} hilo{pendingThreads.length > 1 ? 's' : ''} con pendientes
                  </span>
                </span>
              </div>
              <svg className={`w-4 h-4 text-warm-400 transition-transform ${showOthers ? 'rotate-180' : ''}`}
                fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {showOthers && (
              <div className="mt-2 bg-white rounded-xl border border-warm-200 divide-y divide-warm-100 overflow-hidden">
                {pendingThreads.map((t) => (
                  <Link key={t.id} href={`/thread/${t.id}`}
                    className="flex items-center gap-3 px-5 py-4 hover:bg-warm-50 transition-colors">
                    <div className="w-8 h-8 rounded-full bg-brand-50 flex items-center justify-center flex-shrink-0 text-xs font-medium text-brand-700">
                      {t.name.split(' ').map((w: string) => w[0]).slice(0, 2).join('').toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-warm-900 truncate">{t.name}</p>
                      <p className="text-xs text-amber-600">
                        {t.pendingActions.length} acción{t.pendingActions.length > 1 ? 'es' : ''} pendiente{t.pendingActions.length > 1 ? 's' : ''}
                      </p>
                    </div>
                    <svg className="w-4 h-4 text-warm-300 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ─── HISTORIAL DE REUNIONES ──────────────────────── */}
        {meetings.length > 0 && (
          <div className="bg-white rounded-xl border border-warm-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-warm-100">
              <h2 className="text-sm font-medium text-warm-900">
                Historial · {meetings.length} reunión{meetings.length > 1 ? 'es' : ''}
              </h2>
            </div>
            <div className="divide-y divide-warm-100">
              {meetings.map((m, idx) => {
                const contacts = (m.meeting_contacts ?? []).map((mc: any) => mc.contact).filter(Boolean)
                const prevMeeting = meetings[idx + 1]
                const daysSincePrev = prevMeeting
                  ? Math.round((new Date(m.meeting_date).getTime() - new Date(prevMeeting.meeting_date).getTime()) / 86400000)
                  : null
                return (
                  <Link key={m.id} href={`/meeting/${m.id}`}
                    className="flex items-start gap-4 px-5 py-4 hover:bg-warm-50 transition-colors">
                    <div className="text-center flex-shrink-0 w-10 mt-0.5">
                      <p className="text-lg font-medium text-warm-900 leading-none">
                        {format(parseISO(m.meeting_date), 'd')}
                      </p>
                      <p className="text-xs text-warm-400 mt-0.5">
                        {format(parseISO(m.meeting_date), 'MMM', { locale: es })}
                      </p>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-warm-900 truncate">{m.title}</p>
                        {m.ai_questions
                          ? <span className="text-xs text-brand flex-shrink-0">✓ IA</span>
                          : <span className="text-xs text-warm-300 flex-shrink-0">Sin IA</span>}
                        {daysSincePrev !== null && (
                          <span className="text-xs text-warm-300 flex-shrink-0">+{daysSincePrev}d</span>
                        )}
                      </div>
                      {m.ai_summary && (
                        <p className="text-xs text-warm-500 mt-0.5 truncate">{m.ai_summary}</p>
                      )}
                      {contacts.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {contacts.slice(0, 4).map((c: any) => (
                            <span key={c.id} className="text-xs bg-warm-100 text-warm-500 px-2 py-0.5 rounded-full">
                              {c.name.split(' ').slice(0, 2).join(' ')}
                            </span>
                          ))}
                          {contacts.length > 4 && (
                            <span className="text-xs bg-warm-100 text-warm-500 px-2 py-0.5 rounded-full">
                              +{contacts.length - 4}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                    <svg className="w-4 h-4 text-warm-300 flex-shrink-0 mt-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                )
              })}
            </div>
          </div>
        )}

      </main>

      {showEdit && data && (
        <EditThreadModal
          thread={data.thread as any}
          onClose={() => setShowEdit(false)}
          onSaved={(updated) => {
            setData(prev => prev ? { ...prev, thread: { ...prev.thread, ...updated } } : prev)
            setShowEdit(false)
            showToast('Hilo actualizado')
          }}
        />
      )}
    </div>
  )
}

// ─── Modal de edición de hilo ─────────────────────────────────────────────────

function EditThreadModal({ thread, onClose, onSaved }: {
  thread: any
  onClose: () => void
  onSaved: (updated: any) => void
}) {
  const TYPES: MeetingType[] = ['docentes', 'padres', 'individual', 'direccion']

  const [name, setName] = useState(thread.name ?? '')
  const [type, setType] = useState<MeetingType>(thread.type ?? 'individual')
  const [description, setDescription] = useState(thread.description ?? '')
  const [course, setCourse] = useState(thread.course ?? '')
  const [subject, setSubject] = useState(thread.subject ?? '')
  const [academicYear, setAcademicYear] = useState(thread.academic_year ? String(thread.academic_year) : '')
  const [tagsInput, setTagsInput] = useState((thread.tags ?? []).join(', '))
  const [topics, setTopics] = useState<string[]>(thread.topics ?? [])
  const [selectedContacts, setSelectedContacts] = useState<Contact[]>(
    ((thread as any).thread_contacts as any[] ?? []).map((tc: any) => tc.contact).filter(Boolean)
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleSave = async () => {
    if (!name.trim()) { setError('El nombre es requerido.'); return }
    setSaving(true); setError('')
    const res = await fetch(`/api/threads/${thread.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: name.trim(),
        type,
        description: description.trim() || null,
        course: course.trim() || null,
        subject: subject.trim() || null,
        academic_year: academicYear ? Number(academicYear) : null,
        tags: tagsInput.trim() ? tagsInput.split(',').map((t: string) => t.trim()).filter(Boolean) : null,
        topics: topics.length ? topics : null,
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
          <h2 className="text-base font-medium text-warm-900">Editar hilo</h2>
          <button onClick={onClose} className="text-warm-400 hover:text-warm-600">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-xs font-medium text-warm-500 uppercase tracking-wide block mb-1.5">Nombre *</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full text-sm" />
          </div>

          <div>
            <label className="text-xs font-medium text-warm-500 uppercase tracking-wide block mb-2">Tipo</label>
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
            <label className="text-xs font-medium text-warm-500 uppercase tracking-wide block mb-1.5">Participantes habituales</label>
            <ContactSelector selected={selectedContacts} onChange={setSelectedContacts} />
          </div>

          <div>
            <label className="text-xs font-medium text-warm-500 uppercase tracking-wide block mb-1.5">Descripción</label>
            <input type="text" value={description} onChange={e => setDescription(e.target.value)}
              placeholder="Ej: Seguimiento mensual" className="w-full text-sm" />
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
              <input type="number" value={academicYear} onChange={e => setAcademicYear(e.target.value)} min={2020} max={2040} className="w-full text-sm" />
            </div>
            <div>
              <label className="text-xs text-warm-400 block mb-1">Etiquetas</label>
              <input type="text" value={tagsInput} onChange={e => setTagsInput(e.target.value)} placeholder="urgente, seguimiento" className="w-full text-sm" />
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
