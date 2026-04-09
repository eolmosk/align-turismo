'use client'

import { useEffect, useState } from 'react'

// Versión del anuncio. Si se agrega una nueva tanda de features, subir
// este número y el modal volverá a aparecer para todos los usuarios.
const WHATSNEW_VERSION = '2026-04-08'
const STORAGE_KEY = `align:whatsnew:${WHATSNEW_VERSION}`

interface Item {
  icon: string
  title: string
  body: string
}

const ITEMS: Item[] = [
  {
    icon: '🎙️',
    title: 'Audio HD con transcripción automática',
    body: 'En “Nueva reunión” tenés un modo “Audio HD”: grabás desde el celular o la PC, y al detener Align transcribe con Whisper (calidad superior al dictado, funciona también en iPhone). Pensado para reuniones de hasta 25 minutos.',
  },
  {
    icon: '💬',
    title: 'Preguntar — buscador conversacional',
    body: 'Nueva pestaña “Preguntar” en el dashboard. Hacé preguntas en lenguaje natural sobre el historial de reuniones (“¿qué compromisos quedaron con la familia García?”) y Align responde citando las reuniones relevantes.',
  },
  {
    icon: '📱',
    title: 'Instalable en el celular (PWA)',
    body: 'Ahora podés instalar Align como app. En Chrome Android: menú → “Instalar aplicación”. En iPhone Safari: Compartir → “Agregar a pantalla de inicio”. Queda como una app más, sin barras del navegador.',
  },
  {
    icon: '📅',
    title: 'Hoy — tu inbox diario',
    body: 'Pestaña “Hoy” que muestra tus acciones pendientes, reuniones próximas y reuniones sin procesar. Ideal para abrir Align a la mañana y saber por dónde empezar.',
  },
  {
    icon: '✉️',
    title: 'Digest semanal por email',
    body: 'Cada lunes te llega un resumen con las reuniones de la semana, las que faltan procesar y tus pendientes más recientes.',
  },
]

export default function WhatsNew() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      if (!localStorage.getItem(STORAGE_KEY)) {
        setOpen(true)
      }
    } catch {
      // localStorage bloqueado (modo privado en Safari antiguo, etc.)
    }
  }, [])

  function dismiss() {
    try {
      localStorage.setItem(STORAGE_KEY, '1')
    } catch { /* noop */ }
    setOpen(false)
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-0 sm:p-4" onClick={dismiss}>
      <div
        className="bg-white w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl shadow-xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white border-b border-warm-100 px-5 py-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-warm-400 uppercase tracking-wide">Novedades</p>
            <h2 className="text-lg font-semibold text-warm-900">Qué hay de nuevo en Align</h2>
          </div>
          <button onClick={dismiss} className="text-warm-400 hover:text-warm-700 p-1" aria-label="Cerrar">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">
          {ITEMS.map((item) => (
            <div key={item.title} className="flex gap-3">
              <span className="text-2xl leading-none flex-shrink-0" aria-hidden>{item.icon}</span>
              <div>
                <h3 className="font-medium text-warm-900 text-sm">{item.title}</h3>
                <p className="text-sm text-warm-600 leading-relaxed mt-0.5">{item.body}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="sticky bottom-0 bg-white border-t border-warm-100 px-5 py-3 flex justify-end">
          <button
            onClick={dismiss}
            className="bg-brand hover:bg-brand-600 text-white text-sm font-medium px-4 py-2 rounded-lg"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  )
}
