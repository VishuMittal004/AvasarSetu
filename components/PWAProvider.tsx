'use client'

import { useEffect } from 'react'

type SyncCapableRegistration = ServiceWorkerRegistration & { sync?: { register: (tag: string) => Promise<void> } }

export function PWAProvider() {
  useEffect(() => {
    let active = true
    const syncPending = () => {
      if (!("serviceWorker" in navigator)) return
      void navigator.serviceWorker.ready.then((registration) => {
        const syncRegistration = registration as SyncCapableRegistration
        if (syncRegistration.sync) void syncRegistration.sync.register('sync-queries').catch(() => {})
        registration.active?.postMessage({ type: 'SYNC_QUEUED_SEARCHES' })
      }).catch(() => {})
    }
    window.addEventListener('online', syncPending)
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js', { scope: '/' })
        .then((reg) => {
          if (active) {
            console.log('[AvasarSetu] Service Worker registered:', reg.scope)
            if (navigator.onLine) reg.active?.postMessage({ type: 'SYNC_QUEUED_SEARCHES' })
          }
        })
        .catch((err) => {
          console.error('[AvasarSetu] Service Worker registration failed:', err)
        })
    }
    return () => { active = false; window.removeEventListener('online', syncPending) }
  }, [])

  return null
}

