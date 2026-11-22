import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

const updateSchema = z.object({
  id: z.string().uuid().optional(),
  markAllRead: z.boolean().optional(),
}).refine(value => Boolean(value.id || value.markAllRead))

export async function GET() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return NextResponse.json({ notifications: [], demo: true })
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })
    const { data, error } = await supabase.from('notifications')
      .select('id,type,title,message,link,is_read,created_at')
      .eq('user_id', user.id).order('created_at', { ascending: false }).limit(100)
    if (error) throw error
    return NextResponse.json({ notifications: data ?? [] })
  } catch (error) {
    console.error('[api/notifications] GET failed', error)
    return NextResponse.json({ error: 'Could not load notifications' }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  let input: unknown
  try { input = await request.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }
  const parsed = updateSchema.safeParse(input)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid notification update' }, { status: 400 })
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })
    let query = supabase.from('notifications').update({ is_read: true }).eq('user_id', user.id)
    query = parsed.data.markAllRead ? query.eq('is_read', false) : query.eq('id', parsed.data.id!)
    const { error } = await query
    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[api/notifications] PATCH failed', error)
    return NextResponse.json({ error: 'Could not update notification' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })
    let query = supabase.from('notifications').delete().eq('user_id', user.id)
    if (id) {
      if (!z.string().uuid().safeParse(id).success) return NextResponse.json({ error: 'Invalid notification id' }, { status: 400 })
      query = query.eq('id', id)
    }
    const { error } = await query
    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[api/notifications] DELETE failed', error)
    return NextResponse.json({ error: 'Could not delete notification' }, { status: 500 })
  }
}
