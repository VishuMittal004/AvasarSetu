import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { isValidPushEndpoint } from '@/lib/valid-push-endpoint'

const subscriptionSchema = z.object({
  endpoint: z.string().url().max(2048).refine(isValidPushEndpoint),
  keys: z.object({ p256dh: z.string().min(20).max(256), auth: z.string().min(8).max(256) }),
})

function configured() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY)
}

export async function POST(request: Request) {
  if (!configured()) return NextResponse.json({ error: 'Push notifications are not configured' }, { status: 503 })
  let input: unknown
  try { input = await request.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }
  const parsed = subscriptionSchema.safeParse(input)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid push subscription' }, { status: 400 })
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })
    const record = {
      user_id: user.id,
      endpoint: parsed.data.endpoint,
      p256dh: parsed.data.keys.p256dh,
      auth: parsed.data.keys.auth,
      updated_at: new Date().toISOString(),
    }
    const { error: insertError } = await supabase.from('push_subscriptions').insert(record)
    if (insertError?.code === '23505') {
      const { error } = await supabase.from('push_subscriptions').update({ p256dh: record.p256dh, auth: record.auth, updated_at: record.updated_at })
        .eq('user_id', user.id).eq('endpoint', record.endpoint)
      if (error) throw error
    } else if (insertError) throw insertError
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[api/notifications/push] subscribe failed', error)
    return NextResponse.json({ error: 'Could not save push subscription' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  let input: unknown
  try { input = await request.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }
  const parsed = z.object({ endpoint: z.string().url().max(2048) }).safeParse(input)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid subscription endpoint' }, { status: 400 })
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })
    const { error } = await supabase.from('push_subscriptions').delete()
      .eq('user_id', user.id).eq('endpoint', parsed.data.endpoint)
    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[api/notifications/push] unsubscribe failed', error)
    return NextResponse.json({ error: 'Could not remove push subscription' }, { status: 500 })
  }
}
