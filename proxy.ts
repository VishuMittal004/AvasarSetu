import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const PROTECTED_PREFIXES = [
  '/dashboard', '/explore', '/opportunities',
  '/saved', '/calendar', '/profile', '/documents',
  '/notifications', '/compare', '/settings',
]

// A "real" Supabase URL looks like https://xxxx.supabase.co (with an actual project ref)
// Not a placeholder like "https://placeholder.supabase.co" or "your-project.supabase.co"
function isRealSupabaseUrl(url: string | undefined): boolean {
  if (!url) return false
  if (url.includes('placeholder') || url.includes('your-project')) return false
  // Must be https:// and end with .supabase.co with a real project ref (20+ chars before .supabase)
  try {
    const u = new URL(url)
    const host = u.hostname // e.g. "abcdefghijklmnop.supabase.co"
    return host.endsWith('.supabase.co') && host.split('.')[0].length >= 10
  } catch {
    return false
  }
}

export async function proxy(request: NextRequest) {
  // Auth is handled client-side by Zustand useAuthStore.
  // Server-side Supabase Auth redirect is disabled until Supabase Auth is fully integrated.
  return NextResponse.next({ request })
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|icons/|images/|api/|public/).*)'],
}

