'use client'

import { useEffect, useRef, useState } from 'react'

interface Props {
  onTranscribed: (text: string) => void
}

type State = 'idle' | 'recording' | 'paused' | 'uploading' | 'error'

/**
 * Grabador de audio con MediaRecorder → envía a /api/transcribe (Whisper).
 * Funciona en Chrome Android, Safari iOS y desktop.
 */
export default function AudioRecorder({ onTranscribed }: Props) {
  const [state, setState] = useState<State>('idle')
  const [elapsed, setElapsed] = useState(0)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<number | null>(null)

  // Timer
  useEffect(() => {
    if (state === 'recording') {
      timerRef.current = window.setInterval(() => setElapsed((e) => e + 1), 1000)
    } else if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [state])

  // Cleanup al desmontar
  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop())
    }
  }, [])

  async function start() {
    setErrorMsg(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream

      // Preferir formatos compatibles con Whisper
      const mimeType = pickMimeType()
      const mr = new MediaRecorder(stream, mimeType ? { mimeType } : undefined)
      chunksRef.current = []

      mr.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mr.mimeType || 'audio/webm' })
        streamRef.current?.getTracks().forEach((t) => t.stop())
        streamRef.current = null
        void upload(blob)
      }

      mr.start(1000) // captura chunks cada 1s
      mediaRecorderRef.current = mr
      setElapsed(0)
      setState('recording')
    } catch (e: any) {
      setErrorMsg(e?.message ?? 'No se pudo acceder al micrófono')
      setState('error')
    }
  }

  function pause() {
    mediaRecorderRef.current?.pause()
    setState('paused')
  }

  function resume() {
    mediaRecorderRef.current?.resume()
    setState('recording')
  }

  function stop() {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop()
    }
    setState('uploading')
  }

  function cancel() {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.onstop = null
      mediaRecorderRef.current.stop()
    }
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    chunksRef.current = []
    setElapsed(0)
    setState('idle')
  }

  async function upload(blob: Blob) {
    if (blob.size === 0) {
      setErrorMsg('Grabación vacía')
      setState('error')
      return
    }
    if (blob.size > 25 * 1024 * 1024) {
      setErrorMsg('El audio supera 25 MB. Grabá un tramo más corto.')
      setState('error')
      return
    }
    try {
      const fd = new FormData()
      const ext = blob.type.includes('mp4') ? 'm4a' : 'webm'
      fd.append('file', blob, `grabacion.${ext}`)
      const res = await fetch('/api/transcribe', { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Error')
      onTranscribed(data.text ?? '')
      setState('idle')
      setElapsed(0)
    } catch (e: any) {
      setErrorMsg(e.message ?? 'Error transcribiendo')
      setState('error')
    }
  }

  const mm = String(Math.floor(elapsed / 60)).padStart(2, '0')
  const ss = String(elapsed % 60).padStart(2, '0')

  return (
    <div className="text-center py-6 space-y-4">
      {state === 'idle' && (
        <>
          <button
            onClick={start}
            className="w-16 h-16 rounded-full bg-brand hover:bg-brand-600 text-white flex items-center justify-center mx-auto transition-colors"
            aria-label="Iniciar grabación"
          >
            <svg className="w-7 h-7" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 15c1.66 0 3-1.34 3-3V6c0-1.66-1.34-3-3-3S9 4.34 9 6v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 15 6.7 12H5c0 3.42 2.72 6.23 6 6.72V21h2v-2.28c3.28-.49 6-3.3 6-6.72h-1.7z" />
            </svg>
          </button>
          <p className="text-sm text-warm-500">Tocá para grabar audio. Al detener, se transcribe con Whisper (HD, multiidioma, más preciso que el dictado). Hasta 25 MB.</p>
        </>
      )}

      {(state === 'recording' || state === 'paused') && (
        <>
          <div className="flex items-center justify-center gap-3">
            {state === 'recording' && <span className="w-3 h-3 bg-brand-500 rounded-full animate-pulse" />}
            <span className="text-2xl font-mono text-warm-900 tabular-nums">{mm}:{ss}</span>
          </div>
          <p className="text-sm text-warm-500">{state === 'recording' ? 'Grabando…' : 'En pausa'}</p>
          <div className="flex gap-2 justify-center flex-wrap">
            {state === 'recording' ? (
              <button onClick={pause} className="text-sm px-4 py-2 rounded-lg border border-warm-200 hover:bg-warm-50">Pausar</button>
            ) : (
              <button onClick={resume} className="text-sm px-4 py-2 rounded-lg border border-warm-200 hover:bg-warm-50">Reanudar</button>
            )}
            <button onClick={stop} className="text-sm px-4 py-2 rounded-lg bg-brand text-white hover:bg-brand-600">Detener y transcribir</button>
            <button onClick={cancel} className="text-sm px-4 py-2 rounded-lg text-warm-500 hover:bg-warm-50">Cancelar</button>
          </div>
        </>
      )}

      {state === 'uploading' && (
        <>
          <div className="animate-spin w-8 h-8 border-2 border-brand border-t-transparent rounded-full mx-auto" />
          <p className="text-sm text-warm-500">Transcribiendo con Whisper…<br />Puede tardar hasta un minuto por cada 5 min de audio.</p>
        </>
      )}

      {state === 'error' && (
        <>
          <p className="text-sm text-red-600">{errorMsg}</p>
          <button onClick={() => setState('idle')} className="text-sm px-4 py-2 rounded-lg border border-warm-200 hover:bg-warm-50">
            Intentar de nuevo
          </button>
        </>
      )}
    </div>
  )
}

function pickMimeType(): string | null {
  if (typeof MediaRecorder === 'undefined') return null
  const candidates = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/mp4',
    'audio/mpeg',
    'audio/ogg;codecs=opus',
  ]
  for (const c of candidates) {
    if (MediaRecorder.isTypeSupported(c)) return c
  }
  return null
}
