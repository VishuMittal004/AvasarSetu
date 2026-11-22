const counts = new Map<string, { count: number; reset: number }>()

export function rateLimit(key: string, limit = 20, windowMs = 60000): boolean {
  const now = Date.now()
  const entry = counts.get(key)
  if (!entry || now > entry.reset) {
    counts.set(key, { count: 1, reset: now + windowMs })
    return true
  }
  if (entry.count >= limit) return false
  entry.count++
  return true
}
