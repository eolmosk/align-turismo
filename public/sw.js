// Service worker mínimo para Align PWA.
// Objetivo: que la app sea instalable y cargue rápido desde cache
// para assets estáticos. NO cacheamos respuestas de la API (siempre
// network) para no mostrar datos viejos de reuniones/acciones.

const CACHE_VERSION = 'align-v3'
const STATIC_CACHE = `${CACHE_VERSION}-static`

// Assets que queremos precachear (el resto entra on-demand).
const PRECACHE_URLS = [
  '/',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
  '/apple-touch-icon.png',
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(PRECACHE_URLS)).then(() => self.skipWaiting())
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => !k.startsWith(CACHE_VERSION)).map((k) => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', (event) => {
  const req = event.request

  // Solo GET
  if (req.method !== 'GET') return

  const url = new URL(req.url)

  // Nunca cachear API ni NextAuth — siempre network, dejamos fallar si no hay red
  if (url.pathname.startsWith('/api/')) return
  if (url.pathname.startsWith('/auth/')) return

  // Navigations: network-first, fallback al index cacheado
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).catch(() => caches.match('/').then((r) => r || Response.error()))
    )
    return
  }

  // Assets estáticos (_next/static, imágenes, fonts): cache-first
  if (
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.match(/\.(png|jpg|jpeg|svg|webp|ico|woff2?|ttf|css|js)$/)
  ) {
    event.respondWith(
      caches.match(req).then((cached) => {
        if (cached) return cached
        return fetch(req).then((res) => {
          if (res.ok && res.type === 'basic') {
            const copy = res.clone()
            caches.open(STATIC_CACHE).then((cache) => cache.put(req, copy))
          }
          return res
        })
      })
    )
  }
})
