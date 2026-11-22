import { NextResponse } from 'next/server'

export async function GET() {
  const checks: Record<string, 'ok' | 'unavailable'> = {
    supabase: 'unavailable',
    embeddings: process.env.GEMINI_API_KEY ? 'ok' : 'unavailable',
  }
  if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    try {
      const { createClient } = await import('@supabase/supabase-js')
      const client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
        auth: { autoRefreshToken: false, persistSession: false },
      })
      const { error } = await client.from('opportunities').select('id', { head: true, count: 'estimated' }).limit(1)
      if (!error) checks.supabase = 'ok'
    } catch { /* readiness response reports unavailable without leaking details */ }
  }
  const ready = checks.supabase === 'ok'
  return NextResponse.json({
    status: ready ? 'ok' : 'degraded',
    timestamp: new Date().toISOString(),
    version: '0.1.0',
    checks,
  }, { status: ready ? 200 : 503 })
}
