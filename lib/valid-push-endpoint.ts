const PUSH_HOSTS = [
  'fcm.googleapis.com',
  'updates.push.services.mozilla.com',
  'push.services.mozilla.com',
  'notify.windows.com',
  'push.apple.com',
]

/** Prevent a stored subscription from turning push delivery into arbitrary server-side HTTPS requests. */
export function isValidPushEndpoint(value: string): boolean {
  try {
    const url = new URL(value)
    const host = url.hostname.toLowerCase()
    return url.protocol === 'https:' && !url.username && !url.password && !url.port &&
      url.pathname.length > 1 && PUSH_HOSTS.some(domain => host === domain || host.endsWith(`.${domain}`))
  } catch {
    return false
  }
}
