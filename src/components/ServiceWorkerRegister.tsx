'use client'

import { useEffect } from 'react'

/**
 * Registra el service worker en producción.
 * En dev no lo registramos para evitar caches confusas durante el desarrollo.
 */
export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return
    if (typeof window === 'undefined') return
    if (!('serviceWorker' in navigator)) return

    navigator.serviceWorker
      .register('/sw.js')
      .catch((err) => console.warn('SW register failed', err))
  }, [])

  return null
}
