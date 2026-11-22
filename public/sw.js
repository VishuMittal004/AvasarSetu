const CACHE_VERSION = 'v3'
const CACHE_NAME = `avasarsetu-${CACHE_VERSION}`
const API_CACHE = `avasarsetu-api-${CACHE_VERSION}`
const SEARCH_QUEUE = `avasarsetu-search-queue-${CACHE_VERSION}`

const STATIC_ASSETS = [
  '/',
  '/offline',
  '/manifest.json',
  '/favicon.ico',
]

// Install: pre-cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  )
  self.skipWaiting()
})

// Activate: clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => ![CACHE_NAME, API_CACHE, SEARCH_QUEUE].includes(key))
          .map((key) => caches.delete(key))
      )
    )
  )
  self.clients.claim()
})

// Fetch: different strategies for different request types
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  if (url.protocol === 'chrome-extension:') return

  // Search is network-first. When offline, queue only the public query text
  // (never a profile) for background retry and let Explore use cached jobs.
  if (request.method === 'POST' && url.pathname === '/api/search') {
    event.respondWith((async () => {
      try {
        return await fetch(request.clone())
      } catch {
        let query = ''
        try { query = (await request.clone().json()).query || '' } catch {}
        if (query.length >= 2) {
          const queue = await caches.open(SEARCH_QUEUE)
          const key = new Request(`${self.location.origin}/__queued-search/${Date.now()}-${Math.random().toString(36).slice(2)}`)
          await queue.put(key, new Response(JSON.stringify({ query: query.slice(0, 200), limit: 50 }), {
            headers: { 'Content-Type': 'application/json' },
          }))
          try { await self.registration.sync.register('sync-queries') } catch {}
        }
        return new Response(JSON.stringify({ results: [], total: 0, source: 'offline', queued: query.length >= 2 }), {
          status: 200, headers: { 'Content-Type': 'application/json' },
        })
      }
    })())
    return
  }

  // Do not cache authenticated or user-specific API responses. Only the
  // public opportunities catalogue is eligible for offline reads.
  const isPublicOpportunityData = url.pathname === '/api/opportunities' || /^\/api\/opportunities\/[^/]+$/.test(url.pathname)
  if (request.method === 'GET' && isPublicOpportunityData) {
    event.respondWith((async () => {
      try {
        const response = await fetch(request)
        if (response.ok && !response.headers.get('Cache-Control')?.includes('no-store')) {
          const cache = await caches.open(API_CACHE)
          await cache.put(request, response.clone())
          const keys = await cache.keys()
          if (keys.length > 50) await cache.delete(keys[0])
        }
        return response
      } catch {
        return (await caches.match(request)) || new Response(JSON.stringify({ error: 'Offline catalogue unavailable' }), {
          status: 503, headers: { 'Content-Type': 'application/json' },
        })
      }
    })())
    return
  }

  // Skip remaining non-GET requests.
  if (request.method !== 'GET') return

  // Other API requests are never cached.

  // Static assets and pages: cache-first
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached
      return fetch(request)
        .then((response) => {
          if (response.ok && !url.pathname.startsWith('/_next/')) {
            const clone = response.clone()
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone))
          }
          return response
        })
        .catch(() => {
          // Offline fallback for navigation requests
          if (request.mode === 'navigate') {
            return caches.match('/offline')
          }
          return new Response('', { status: 408, statusText: 'Offline' })
        })
    })
  )
})

// Push notification handler
self.addEventListener('push', (event) => {
  let data = { title: 'AvasarSetu', body: 'You have a new update', url: '/dashboard' }
  try {
    if (event.data) data = { ...data, ...event.data.json() }
  } catch {}

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      tag: data.url,
      requireInteraction: false,
      data: { url: data.url },
    })
  )
})

// Notification click: open the app to the relevant URL
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = event.notification.data?.url ?? '/dashboard'
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      const existing = windowClients.find((c) => c.url.includes(url))
      if (existing) return existing.focus()
      return clients.openWindow(url)
    })
  )
})

// Background sync for queued requests
async function syncQueuedSearches() {
  const queue = await caches.open(SEARCH_QUEUE)
  const keys = await queue.keys()
  let completed = 0
  for (const key of keys) {
    const queued = await queue.match(key)
    if (!queued) continue
    try {
      const body = await queued.json()
      const response = await fetch('/api/search', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      })
      if (response.ok || response.status === 400) {
        await queue.delete(key)
        completed++
      }
    } catch { /* leave queued for the next retry */ }
  }
  const cs = await clients.matchAll({ type: 'window', includeUncontrolled: true })
  cs.forEach((client) => client.postMessage({ type: 'SYNC_COMPLETE', completed }))
  if ((await queue.keys()).length) throw new Error('Some queued searches still need retrying')
}

self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-queries') event.waitUntil(syncQueuedSearches())
})

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SYNC_QUEUED_SEARCHES') event.waitUntil(syncQueuedSearches())
  if (event.data?.type === 'CLEAR_QUEUED_SEARCHES') event.waitUntil(caches.delete(SEARCH_QUEUE))
})

