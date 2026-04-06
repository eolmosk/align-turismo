'use client'
import { useState, useRef, useCallback, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useDropzone } from 'react-dropzone'
import { MeetingType, InputMethod, MEETING_TYPE_LABELS, Contact, TOPICS, TOPIC_LABELS } from '@/types'
import ContactSelector from '@/components/ContactSelector'
import SchoolLogo from '@/components/SchoolLogo'

const TYPES: MeetingType[] = ['docentes', 'padres', 'individual', 'direccion']
const DURATIONS = [30, 45, 60, 90, 120]

interface ThreadOption { id: string; name: string; type: MeetingType; participants: string | null }

function NewMeetingContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const preselectedThreadId = searchParams.get('thread')
  const isOnboarding = searchParams.get('onboarding') === '1'

  // Datos básicos
  const [type, setType] = useState<MeetingType>('docentes')
  const [title, setTitle] = useState('')
  const [participants, setParticipants] = useState('')
  const [meetingDate, setMeetingDate] = useState(new Date().toISOString().split('T')[0])

  // Hilo
  const [threads, setThreads] = useState<ThreadOption[]>([])
  const [selectedThreadId, setSelectedThreadId] = useState<string>(preselectedThreadId ?? '')
  const [threadSearch, setThreadSearch] = useState('')
  const [showThreadDropdown, setShowThreadDropdown] = useState(false)
  const [threadMode, setThreadMode] = useState<'hilo' | 'suelta'>(preselectedThreadId ? 'hilo' : 'suelta')

  // Notas
  const [notes, setNotes] = useState('')
  const [inputMethod, setInputMethod] = useState<InputMethod>('text')
  const [liveMode, setLiveMode] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [interimText, setInterimText] = useState('')
  const [fileName, setFileName] = useState('')

  // Contactos
  const [selectedContacts, setSelectedContacts] = useState<Contact[]>([])

  // Metadata académica
  const [course, setCourse] = useState('')
  const [subject, setSubject] = useState('')
  const [academicYear, setAcademicYear] = useState('')
  const [tagsInput, setTagsInput] = useState('')
  const [topic, setTopic] = useState('')

  // Clasificación colapsada
  const [showClassification, setShowClassification] = useState(false)

  // Fase post-guardado: preguntar por próxima reunión
  const [phase, setPhase] = useState<'form' | 'next-meeting'>('form')
  const [savedMeetingId, setSavedMeetingId] = useState('')
  const [savedThreadId, setSavedThreadId] = useState('')
  const [nextDate, setNextDate] = useState('')
  const [nextTime, setNextTime] = useState('09:00')
  const [nextDuration, setNextDuration] = useState(60)
  const [schedulingNext, setSchedulingNext] = useState(false)

  // Estado general
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const recognitionRef = useRef<any>(null)
  const transcriptRef = useRef('')

  // Cargar hilos disponibles
  useEffect(() => {
    fetch('/api/threads')
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) setThreads(data)
        // Si hay hilo preseleccionado, buscarlo y mostrar su nombre
        if (preselectedThreadId) {
          const t = data.find((t: ThreadOption) => t.id === preselectedThreadId)
          if (t) {
            setThreadSearch(t.name)
            setType(t.type)
            fetch(`/api/contacts?thread_id=${t.id}`)
              .then(r => r.json())
              .then(contacts => { if (Array.isArray(contacts)) setSelectedContacts(contacts) })
              .catch(() => {})
          }
        }
      })
      .catch(() => {})
  }, [preselectedThreadId])

  const selectedThread = threads.find(t => t.id === selectedThreadId)
  const filteredThreads = threads.filter(t =>
    t.name.toLowerCase().includes(threadSearch.toLowerCase())
  )

  const selectThread = (t: ThreadOption) => {
    setSelectedThreadId(t.id)
    setThreadSearch(t.name)
    setType(t.type)
    setShowThreadDropdown(false)
    // Pre-cargar contactos del hilo
    fetch(`/api/contacts?thread_id=${t.id}`)
      .then(r => r.json())
      .then(contacts => { if (Array.isArray(contacts)) setSelectedContacts(contacts) })
      .catch(() => {})
  }

  const clearThread = () => {
    setSelectedThreadId('')
    setThreadSearch('')
    setShowThreadDropdown(false)
  }

  // Voz
  const startSpeech = (onFinal: (t: string) => void, onInterim: (t: string) => void) => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SR) { setError('Tu navegador no soporta reconocimiento de voz. Usá Chrome.'); return }
    const rec = new SR()
    rec.lang = 'es-UY'; rec.continuous = true; rec.interimResults = true
    rec.onresult = (e: any) => {
      let final = '', interim = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) final += e.results[i][0].transcript + ' '
        else interim += e.results[i][0].transcript
      }
      if (final) onFinal(final); onInterim(interim)
    }
    rec.onend = () => { setIsRecording(false); setInterimText('') }
    rec.start(); recognitionRef.current = rec
  }

  const toggleDictation = () => {
    if (isRecording) { recognitionRef.current?.stop(); setIsRecording(false); setInterimText(''); return }
    startSpeech(f => setTranscript(t => t + f), setInterimText); setIsRecording(true)
  }

  const toggleLive = () => {
    if (isRecording) { recognitionRef.current?.stop(); setIsRecording(false); setInterimText(''); return }
    transcriptRef.current = transcript
    startSpeech(f => { transcriptRef.current += f; setTranscript(transcriptRef.current) }, setInterimText)
    setIsRecording(true)
  }

  // Archivo
  const onDrop = useCallback((files: File[]) => {
    const file = files[0]; if (!file) return
    setFileName(file.name)
    const reader = new FileReader()
    reader.onload = e => setTranscript((e.target?.result as string)?.slice(0, 5000) ?? '')
    reader.readAsText(file)
  }, [])
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop, accept: { 'text/plain': ['.txt'], 'application/pdf': ['.pdf'] }, maxFiles: 1
  })

  const getActiveNotes = () => inputMethod === 'text' && !liveMode ? notes : transcript

  const handleSubmit = async () => {
    const activeNotes = getActiveNotes()
    if (!activeNotes.trim()) { setError('Las notas son requeridas.'); return }
    if (threadMode === 'hilo' && !selectedThreadId) { setError('Seleccioná un hilo o elegí "Sin hilo".'); return }

    // Auto-generar título si está vacío
    const finalTitle = title.trim() || (
      selectedThread
        ? `Seguimiento · ${new Date(meetingDate).toLocaleDateString('es-UY', { day: 'numeric', month: 'long' })}`
        : 'Reunión sin título'
    )

    setSaving(true); setError('')
    try {
      const res = await fetch('/api/meetings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: finalTitle, type,
          meeting_date: meetingDate,
          participants: participants || undefined,
          notes: activeNotes,
          input_method: liveMode ? 'voice' : inputMethod,
          is_live_transcript: liveMode,
          thread_id: threadMode === 'hilo' && selectedThreadId ? selectedThreadId : undefined,
          course: course.trim() || undefined,
          subject: subject.trim() || undefined,
          academic_year: academicYear ? Number(academicYear) : undefined,
          tags: tagsInput.trim() ? tagsInput.split(',').map(t => t.trim()).filter(Boolean) : undefined,
          topic: topic || undefined,
          contact_ids: selectedContacts.length > 0 ? selectedContacts.map(c => c.id) : undefined,
        }),
      })
      if (!res.ok) throw new Error('Error guardando la reunión')
      const meeting = await res.json()

      fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ meetingId: meeting.id, isLiveTranscript: liveMode }),
      }).catch(console.error)

      // Mostrar paso de "próxima reunión" antes de redirigir
      setSavedMeetingId(meeting.id)
      setSavedThreadId(threadMode === 'hilo' ? selectedThreadId : '')
      setSaving(false)
      setPhase('next-meeting')
    } catch (e: any) {
      setError(e.message ?? 'Error inesperado'); setSaving(false)
    }
  }

  const handleScheduleNext = async () => {
    if (!nextDate) return skipNext()
    setSchedulingNext(true)
    await fetch(`/api/meetings/${savedMeetingId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ next_date: nextDate, next_time: nextTime, next_duration: nextDuration }),
    })
    skipNext()
  }

  const skipNext = () => {
    const onboardingParam = isOnboarding ? '&onboarding=1' : ''
    const redirect = savedThreadId
      ? `/meeting/${savedMeetingId}?new=1&thread=${savedThreadId}${onboardingParam}`
      : `/meeting/${savedMeetingId}?new=1${onboardingParam}`
    router.push(redirect)
  }

  const formatDuration = (d: number) => d < 60 ? `${d} min` : `${Math.floor(d/60)}h${d%60 ? ` ${d%60}min` : ''}`

  // ── Fase 2: ¿Agendás la próxima reunión? ────────────────────────────────────
  if (phase === 'next-meeting') {
    const fmtDur = (d: number) => d < 60 ? `${d} min` : `${Math.floor(d/60)}h${d%60 ? ` ${d%60}min` : ''}`
    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-6">
        <div className="bg-white rounded-2xl border border-warm-200 w-full max-w-md p-8">
          <div className="flex items-center justify-center w-12 h-12 rounded-full bg-brand-50 mx-auto mb-5">
            <svg className="w-6 h-6 text-brand" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-base font-medium text-warm-900 text-center mb-1">Reunión guardada</h2>
          <p className="text-sm text-warm-500 text-center mb-6">La IA está procesando las notas.</p>

          <div className="border-t border-warm-100 pt-6">
            <p className="text-sm font-medium text-warm-900 mb-4">¿Agendás una próxima reunión?</p>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-warm-400 block mb-1">Fecha</label>
                <input type="date" value={nextDate} onChange={e => setNextDate(e.target.value)} className="w-full text-sm" />
              </div>
              {nextDate && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-warm-400 block mb-1">Hora</label>
                    <input type="time" value={nextTime} onChange={e => setNextTime(e.target.value)} className="w-full text-sm" />
                  </div>
                  <div>
                    <label className="text-xs text-warm-400 block mb-1">Duración</label>
                    <select value={nextDuration} onChange={e => setNextDuration(Number(e.target.value))} className="w-full text-sm">
                      {DURATIONS.map(d => <option key={d} value={d}>{fmtDur(d)}</option>)}
                    </select>
                  </div>
                </div>
              )}
            </div>
            <div className="flex gap-3 mt-6">
              {nextDate ? (
                <button onClick={handleScheduleNext} disabled={schedulingNext}
                  className="flex-1 bg-brand text-white text-sm py-3 rounded-xl font-medium hover:bg-brand-600 disabled:opacity-50">
                  {schedulingNext ? 'Guardando...' : 'Confirmar próxima reunión'}
                </button>
              ) : (
                <button onClick={skipNext}
                  className="flex-1 bg-brand text-white text-sm py-3 rounded-xl font-medium hover:bg-brand-600">
                  Ver reunión →
                </button>
              )}
              {nextDate && (
                <button onClick={skipNext} className="px-4 py-3 text-sm text-warm-500 border border-warm-200 rounded-xl hover:bg-warm-50">
                  Omitir
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      <header className="bg-white border-b border-warm-200 px-6 py-4">
        <div className="max-w-2xl mx-auto flex items-center gap-4">
          <button onClick={() => isOnboarding ? router.push('/dashboard') : router.back()} className="text-warm-400 hover:text-warm-600">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <SchoolLogo />
          <h1 className="text-base font-medium text-warm-900">Nueva reunión</h1>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-8 space-y-5">

        {/* ─── HILO ─────────────────────────────────────────── */}
        <div className="bg-white rounded-xl border border-warm-200 p-5">
          <label className="text-xs font-medium text-warm-500 uppercase tracking-wide block mb-3">
            Hilo de seguimiento
          </label>

          {/* Toggle hilo / suelta */}
          <div className="flex gap-1 mb-4 bg-warm-100 p-1 rounded-lg w-fit">
            <button onClick={() => setThreadMode('hilo')}
              className={`text-xs px-3 py-1.5 rounded-md transition-colors ${threadMode === 'hilo' ? 'bg-white text-warm-900 shadow-sm' : 'text-warm-500 hover:text-warm-700'}`}>
              Asignar a un hilo
            </button>
            <button onClick={() => { setThreadMode('suelta'); clearThread() }}
              className={`text-xs px-3 py-1.5 rounded-md transition-colors ${threadMode === 'suelta' ? 'bg-white text-warm-900 shadow-sm' : 'text-warm-500 hover:text-warm-700'}`}>
              Sin hilo
            </button>
          </div>

          {threadMode === 'hilo' && (
            <div className="relative">
              <div className={`flex items-center gap-2 border rounded-lg px-3 py-2 transition-colors ${showThreadDropdown ? 'border-blue-400 ring-2 ring-blue-100' : 'border-warm-200'}`}>
                {selectedThread && (
                  <span className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 ${
                    selectedThread.type === 'docentes' ? 'bg-brand-50 text-brand' :
                    selectedThread.type === 'padres' ? 'bg-brand-50 text-green-700' :
                    selectedThread.type === 'individual' ? 'bg-brand-50 text-brand-700' :
                    'bg-warm-100 text-warm-600'
                  }`}>
                    {MEETING_TYPE_LABELS[selectedThread.type]}
                  </span>
                )}
                <input
                  type="text"
                  value={threadSearch}
                  onChange={e => { setThreadSearch(e.target.value); setShowThreadDropdown(true); if (!e.target.value) clearThread() }}
                  onFocus={() => setShowThreadDropdown(true)}
                  placeholder="Buscar o elegir un hilo..."
                  className="flex-1 text-sm border-none outline-none bg-transparent p-0 focus:ring-0"
                  style={{ boxShadow: 'none' }}
                />
                {selectedThreadId && (
                  <button onClick={clearThread} className="text-warm-400 hover:text-warm-600 flex-shrink-0">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
                    </svg>
                  </button>
                )}
              </div>

              {showThreadDropdown && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-warm-200 rounded-xl shadow-lg z-10 overflow-hidden max-h-48 overflow-y-auto">
                  {filteredThreads.length === 0 ? (
                    <div className="px-4 py-3 text-sm text-warm-500">
                      {threadSearch ? 'No hay hilos que coincidan' : 'No hay hilos creados todavía'}
                    </div>
                  ) : (
                    filteredThreads.map(t => (
                      <button key={t.id} onClick={() => selectThread(t)}
                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-warm-50 text-left transition-colors border-b border-warm-50 last:border-0">
                        <div className="w-7 h-7 rounded-full bg-warm-100 flex items-center justify-center flex-shrink-0 text-xs font-medium text-warm-600">
                          {t.name.split(' ').map((w: string) => w[0]).slice(0, 2).join('').toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-warm-900 truncate">{t.name}</p>
                          {t.participants && <p className="text-xs text-warm-500 truncate">{t.participants}</p>}
                        </div>
                        <span className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 ${
                          t.type === 'docentes' ? 'bg-brand-50 text-brand' :
                          t.type === 'padres' ? 'bg-brand-50 text-green-700' :
                          t.type === 'individual' ? 'bg-brand-50 text-brand-700' :
                          'bg-warm-100 text-warm-600'
                        }`}>
                          {MEETING_TYPE_LABELS[t.type]}
                        </span>
                      </button>
                    ))
                  )}
                </div>
              )}

              {selectedThread && (
                <p className="text-xs text-brand mt-1.5">
                  Esta reunión se agregará al historial de "{selectedThread.name}"
                </p>
              )}
            </div>
          )}

          {threadMode === 'suelta' && (
            <p className="text-xs text-warm-400">
              La reunión se guardará sin asociarse a ningún hilo. Podés asignarla a un hilo después.
            </p>
          )}
        </div>

        {/* ─── TIPO (solo si no hay hilo seleccionado) ─────── */}
        {!selectedThread && (
          <div className="bg-white rounded-xl border border-warm-200 p-5">
            <label className="text-xs font-medium text-warm-500 uppercase tracking-wide block mb-3">Tipo de reunión</label>
            <div className="flex gap-2 flex-wrap">
              {TYPES.map(t => (
                <button key={t} onClick={() => setType(t)}
                  className={`text-sm px-4 py-2 rounded-full border transition-colors ${type === t ? 'bg-brand text-white border-brand' : 'border-warm-200 text-warm-600 hover:border-warm-300'}`}>
                  {MEETING_TYPE_LABELS[t]}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ─── DATOS BÁSICOS ────────────────────────────────── */}
        <div className="bg-white rounded-xl border border-warm-200 p-5 space-y-4">
          <div>
            <label className="text-xs font-medium text-warm-500 uppercase tracking-wide block mb-1.5">Nombre de la reunión *</label>
            <input type="text" value={title} onChange={e => setTitle(e.target.value)}
              placeholder={selectedThread ? `Reunión con ${selectedThread.name}` : 'Ej: Reunión docentes 3er grado'}
              className="w-full text-sm" />
          </div>
          <div>
            <label className="text-xs font-medium text-warm-500 uppercase tracking-wide block mb-1.5">Fecha</label>
            <input type="date" value={meetingDate} onChange={e => setMeetingDate(e.target.value)} className="w-full text-sm" />
          </div>
          <div>
            <label className="text-xs font-medium text-warm-500 uppercase tracking-wide block mb-1.5">Participantes</label>
            <ContactSelector selected={selectedContacts} onChange={setSelectedContacts} />
          </div>
        </div>

        {/* ─── CLASIFICACIÓN (colapsada) ───────────────────── */}
        <div className="bg-white rounded-xl border border-warm-200 overflow-hidden">
          <button type="button" onClick={() => setShowClassification(!showClassification)}
            className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-warm-50 transition-colors text-left">
            <span className="text-xs font-medium text-warm-500 uppercase tracking-wide">
              Clasificación <span className="text-warm-400 normal-case font-normal">(opcional)</span>
              {(topic || course || subject) && <span className="ml-2 text-brand normal-case font-normal">· completada</span>}
            </span>
            <svg className={`w-4 h-4 text-warm-400 transition-transform ${showClassification ? 'rotate-180' : ''}`}
              fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {showClassification && (
            <div className="px-5 pb-5 pt-1 space-y-4 border-t border-warm-100">
              <div>
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
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-warm-400 block mb-1">Curso / Grupo</label>
                  <input type="text" value={course} onChange={e => setCourse(e.target.value)}
                    placeholder="Ej: 3ro A" className="w-full text-sm" />
                </div>
                <div>
                  <label className="text-xs text-warm-400 block mb-1">Materia</label>
                  <input type="text" value={subject} onChange={e => setSubject(e.target.value)}
                    placeholder="Ej: Matemáticas" className="w-full text-sm" />
                </div>
                <div>
                  <label className="text-xs text-warm-400 block mb-1">Año lectivo</label>
                  <input type="number" value={academicYear} onChange={e => setAcademicYear(e.target.value)}
                    placeholder={String(new Date().getFullYear())} min={2020} max={2040} className="w-full text-sm" />
                </div>
                <div>
                  <label className="text-xs text-warm-400 block mb-1">Etiquetas</label>
                  <input type="text" value={tagsInput} onChange={e => setTagsInput(e.target.value)}
                    placeholder="urgente, seguimiento" className="w-full text-sm" />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ─── NOTAS ────────────────────────────────────────── */}
        <div className="bg-white rounded-xl border border-warm-200 p-5">
          <label className="text-xs font-medium text-warm-500 uppercase tracking-wide block mb-3">Notas / Minuta *</label>

          <div className="flex gap-1 mb-4 bg-warm-100 p-1 rounded-lg w-fit">
            {(['text', 'voice', 'file'] as InputMethod[]).map(m => (
              <button key={m} onClick={() => { setInputMethod(m); setLiveMode(false) }}
                className={`text-xs px-3 py-1.5 rounded-md transition-colors ${inputMethod === m && !liveMode ? 'bg-white text-warm-900 shadow-sm' : 'text-warm-500 hover:text-warm-700'}`}>
                {m === 'text' ? 'Texto' : m === 'voice' ? 'Dictado' : 'Archivo'}
              </button>
            ))}
            <button onClick={() => { setInputMethod('voice'); setLiveMode(true) }}
              className={`text-xs px-3 py-1.5 rounded-md transition-colors ${liveMode ? 'bg-white text-warm-900 shadow-sm' : 'text-warm-500 hover:text-warm-700'}`}>
              En vivo
            </button>
          </div>

          {inputMethod === 'text' && !liveMode && (
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={8} className="w-full text-sm resize-none"
              placeholder="Escribí o pegá las notas de la reunión...&#10;&#10;- Temas tratados&#10;- Decisiones tomadas&#10;- Compromisos asumidos" />
          )}

          {inputMethod === 'voice' && !liveMode && (
            <div className="text-center py-6">
              <button onClick={toggleDictation}
                className={`w-14 h-14 rounded-full border-2 flex items-center justify-center mx-auto mb-3 transition-all ${isRecording ? 'border-brand-400 bg-brand-50 animate-pulse' : 'border-warm-300 hover:border-warm-400'}`}>
                <svg className={`w-6 h-6 ${isRecording ? 'text-brand-700' : 'text-warm-500'}`} fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 15c1.66 0 3-1.34 3-3V6c0-1.66-1.34-3-3-3S9 4.34 9 6v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 15 6.7 12H5c0 3.42 2.72 6.23 6 6.72V21h2v-2.28c3.28-.49 6-3.3 6-6.72h-1.7z"/>
                </svg>
              </button>
              <p className="text-sm text-warm-500 mb-4">{isRecording ? 'Grabando... tocá para detener' : 'Tocá para dictar las notas'}</p>
              {(transcript || interimText) && (
                <div className="text-left bg-warm-50 rounded-lg p-4 text-sm text-warm-700 leading-relaxed max-h-48 overflow-y-auto">
                  {transcript}<span className="text-warm-400">{interimText}</span>
                </div>
              )}
            </div>
          )}

          {liveMode && (
            <div>
              <div className={`rounded-xl border-2 p-5 mb-4 transition-all ${isRecording ? 'border-red-300 bg-brand-50' : 'border-warm-200 bg-warm-50'}`}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    {isRecording && <span className="w-2 h-2 bg-brand-500 rounded-full animate-pulse" />}
                    <span className="text-sm font-medium text-warm-700">{isRecording ? 'Grabando reunión en vivo...' : 'Grabación en vivo'}</span>
                  </div>
                  <button onClick={toggleLive}
                    className={`text-sm px-4 py-2 rounded-lg font-medium transition-colors ${isRecording ? 'bg-brand-500 text-white hover:bg-red-600' : 'bg-brand text-white hover:bg-brand-600'}`}>
                    {isRecording ? 'Detener' : 'Iniciar grabación'}
                  </button>
                </div>
                <p className="text-xs text-warm-500">
                  {isRecording ? 'La conversación se transcribe en tiempo real. Al guardar, la IA generará la minuta completa.' : 'Iniciá la grabación durante la reunión.'}
                </p>
              </div>
              {(transcript || interimText) && (
                <div className="bg-white border border-warm-200 rounded-lg p-4 max-h-64 overflow-y-auto">
                  <p className="text-xs text-warm-400 mb-2 uppercase tracking-wide">Transcripción en curso</p>
                  <p className="text-sm text-warm-700 leading-relaxed whitespace-pre-wrap">
                    {transcript}<span className="text-warm-400">{interimText}</span>
                  </p>
                </div>
              )}
            </div>
          )}

          {inputMethod === 'file' && !liveMode && (
            <div {...getRootProps()} className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${isDragActive ? 'border-blue-400 bg-brand-50' : 'border-warm-200 hover:border-warm-300'}`}>
              <input {...getInputProps()} />
              <svg className="w-8 h-8 text-warm-300 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              {fileName ? <p className="text-sm text-brand font-medium">{fileName} cargado</p>
                : <><p className="text-sm text-warm-500">Arrastrá un archivo o hacé clic</p><p className="text-xs text-warm-400 mt-1">.txt · .pdf</p></>}
            </div>
          )}
        </div>

        {error && <p className="text-sm text-brand-700">{error}</p>}

        <div className="flex gap-3">
          <button onClick={handleSubmit} disabled={saving}
            className="flex-1 bg-brand text-white text-sm py-3 rounded-xl font-medium hover:bg-brand-600 transition-colors disabled:opacity-50">
            {saving ? 'Guardando...' : 'Guardar y generar seguimiento'}
          </button>
          <button onClick={() => isOnboarding ? router.push('/dashboard') : router.back()} className="px-5 py-3 text-sm text-warm-600 border border-warm-200 rounded-xl hover:bg-warm-50">
            Cancelar
          </button>
        </div>

      </main>
    </div>
  )
}

export default function NewMeetingPage() {
  return (
    <Suspense>
      <NewMeetingContent />
    </Suspense>
  )
}
