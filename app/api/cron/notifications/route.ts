import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { isCronAuthorized } from '@/lib/cron-auth'
import { initWebPush } from '@/lib/webpush'
import { isValidPushEndpoint } from '@/lib/valid-push-endpoint'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function GET(request: Request) {
  if (!isCronAuthorized(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return NextResponse.json({ error: 'Supabase is not configured' }, { status: 503 })
  const pushConfigured = Boolean(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY && process.env.VAPID_EMAIL)
  const admin = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
  const now = new Date()
  const horizon = new Date(now.getTime() + 7 * 86400000)

  try {
    const { data: saved, error } = await admin.from('saved_opportunities')
      .select('user_id,opportunity_id,status,opportunities!inner(id,title,deadline,is_active)')
      .in('status', ['saved', 'in-progress'])
      .gte('opportunities.deadline', now.toISOString())
      .lte('opportunities.deadline', horizon.toISOString())
      .eq('opportunities.is_active', true)
    if (error) throw error

    let created = 0
    let delivered = 0
    let pushFailures = 0
    const wp = pushConfigured ? initWebPush() : null
    for (const item of saved ?? []) {
      const opportunity = Array.isArray(item.opportunities) ? item.opportunities[0] : item.opportunities
      if (!opportunity?.deadline) continue
      const daysLeft = Math.ceil((new Date(opportunity.deadline).getTime() - now.getTime()) / 86400000)
      if (daysLeft !== 1 && daysLeft !== 7) continue
      const dedupeKey = `deadline:${item.user_id}:${item.opportunity_id}:${daysLeft}`
      const { data: inserted, error: insertError } = await admin.from('notifications').upsert({
        user_id: item.user_id,
        type: 'deadline',
        title: daysLeft === 1 ? 'Deadline tomorrow' : 'Deadline in 7 days',
        message: `${opportunity.title} closes in ${daysLeft} day${daysLeft === 1 ? '' : 's'}. Confirm the deadline on the source site.`,
        link: `/opportunities/${opportunity.id}`,
        dedupe_key: dedupeKey,
      }, { onConflict: 'dedupe_key', ignoreDuplicates: true }).select('id').maybeSingle()
      if (insertError) {
        console.error('[cron/notifications] could not save notification', insertError.message)
        continue
      }
      if (!inserted) continue
      created++
      if (!wp) continue

      const { data: subscriptions, error: subscriptionError } = await admin.from('push_subscriptions')
        .select('id,endpoint,p256dh,auth').eq('user_id', item.user_id)
      if (subscriptionError) {
        pushFailures++
        continue
      }
      for (const subscription of subscriptions ?? []) {
        if (!isValidPushEndpoint(subscription.endpoint)) {
          await admin.from('push_subscriptions').delete().eq('id', subscription.id)
          continue
        }
        try {
          await wp.sendNotification({ endpoint: subscription.endpoint, keys: { p256dh: subscription.p256dh, auth: subscription.auth } }, JSON.stringify({
            title: daysLeft === 1 ? 'Deadline tomorrow' : 'Deadline in 7 days',
            body: `${opportunity.title} closes in ${daysLeft} day${daysLeft === 1 ? '' : 's'}.`,
            url: `/opportunities/${opportunity.id}`,
          }))
          await admin.from('push_subscriptions').update({ last_used_at: new Date().toISOString() }).eq('id', subscription.id)
          delivered++
        } catch (pushError) {
          const statusCode = (pushError as { statusCode?: number }).statusCode
          if (statusCode === 404 || statusCode === 410) {
            await admin.from('push_subscriptions').delete().eq('id', subscription.id)
          } else {
            pushFailures++
            console.warn('[cron/notifications] push delivery failed', statusCode ?? 'unknown')
          }
        }
      }
    }
    return NextResponse.json({ ok: true, checked: saved?.length ?? 0, created, delivered, pushFailures, pushConfigured })
  } catch (error) {
    console.error('[cron/notifications] failed', error)
    return NextResponse.json({ error: 'Notification delivery failed' }, { status: 500 })
  }
}
