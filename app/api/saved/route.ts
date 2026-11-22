import { NextResponse } from 'next/server'
import { z } from 'zod'

const savedBody = z.object({
  opportunityId: z.string().min(1).max(100),
  status: z.enum(['saved', 'applied', 'in-progress', 'expired']).optional(),
})

function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''
  return (
    url.startsWith('https://') &&
    !url.includes('placeholder') &&
    !url.includes('your-project') &&
    key.length > 20 &&
    !key.includes('placeholder')
  )
}

/**
 * GET /api/saved
 * Returns saved opportunity IDs for the authenticated user (Supabase auth).
 * Falls back to empty list in demo mode (client uses Zustand localStorage).
 */
export async function GET() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ saved: [], demo: true })
  }

  try {
    const { createClient } = await import('@/lib/supabase/server')
    const sb = await createClient()
    const { data: { user } } = await sb.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })

    const { data, error } = await sb
      .from('saved_opportunities')
      .select('opportunity_id, saved_at, status')
      .eq('user_id', user.id)
      .order('saved_at', { ascending: false })

    if (error) throw error

    return NextResponse.json({ saved: data ?? [] })
  } catch (err) {
    console.error('[api/saved] GET error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

/**
 * POST /api/saved
 * Save an opportunity for the authenticated user.
 * Body: { opportunityId: string }
 */
export async function POST(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ success: true, demo: true })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = savedBody.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid saved opportunity' }, { status: 400 })

  try {
    const { createClient } = await import('@/lib/supabase/server')
    const sb = await createClient()
    const { data: { user } } = await sb.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })

    const { error } = await sb
      .from('saved_opportunities')
      .upsert(
        { user_id: user.id, opportunity_id: parsed.data.opportunityId, status: parsed.data.status ?? 'saved' },
        { onConflict: 'user_id,opportunity_id' }
      )

    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[api/saved] POST error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

/** PATCH /api/saved — update application tracking status. */
export async function PATCH(request: Request) {
  if (!isSupabaseConfigured()) return NextResponse.json({ success: true, demo: true })
  let body: unknown
  try { body = await request.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  const parsed = savedBody.safeParse(body)
  if (!parsed.success || !parsed.data.status) {
    return NextResponse.json({ error: 'opportunityId and a valid status are required' }, { status: 400 })
  }
  try {
    const { createClient } = await import('@/lib/supabase/server')
    const sb = await createClient()
    const { data: { user } } = await sb.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })
    const { error } = await sb.from('saved_opportunities')
      .update({ status: parsed.data.status })
      .eq('user_id', user.id)
      .eq('opportunity_id', parsed.data.opportunityId)
    if (error) throw error
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Could not update saved opportunity' }, { status: 500 })
  }
}

/**
 * DELETE /api/saved
 * Unsave an opportunity.
 * Body: { opportunityId: string }
 */
export async function DELETE(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ success: true, demo: true })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  const parsed = savedBody.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid saved opportunity' }, { status: 400 })

  try {
    const { createClient } = await import('@/lib/supabase/server')
    const sb = await createClient()
    const { data: { user } } = await sb.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })

    const { error } = await sb
      .from('saved_opportunities')
      .delete()
      .eq('user_id', user.id)
      .eq('opportunity_id', parsed.data.opportunityId)

    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[api/saved] DELETE error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

