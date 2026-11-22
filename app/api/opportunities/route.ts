import { NextResponse } from 'next/server'
import { DEMO_OPPORTUNITIES } from '@/data/demoOpportunities'
import type { OpportunityType, UserCategory } from '@/types'
import { z } from 'zod'
import { rowToOpportunity } from '@/services/OpportunityService'
import { rateLimit } from '@/lib/ratelimit'

const typeValues = ['job', 'scholarship', 'scheme', 'college', 'exam', 'internship', 'subsidy', 'pension'] as const
const categoryValues = ['General', 'OBC', 'SC', 'ST', 'EWS'] as const

function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''
  return (
    url.startsWith('https://') &&
    !url.includes('your-project') &&
    !url.includes('placeholder') &&
    key.length > 20 &&
    !key.includes('placeholder')
  )
}

export async function GET(request: Request) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  if (!rateLimit(`opportunities:${ip}`, 120, 60_000)) return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 })
  const { searchParams } = new URL(request.url)
  const rawType = searchParams.get('type')
  const rawState = searchParams.get('state')
  const rawCategory = searchParams.get('category')
  const rawLimit = Number(searchParams.get('limit') ?? 100)
  const rawOffset = Number(searchParams.get('offset') ?? 0)
  if ((rawType && !z.enum(typeValues).safeParse(rawType).success) ||
      (rawState && !z.string().min(1).max(100).regex(/^[\p{L}\p{N} -]+$/u).safeParse(rawState).success) ||
      (rawCategory && !z.enum(categoryValues).safeParse(rawCategory).success) ||
      !Number.isInteger(rawLimit) || rawLimit < 1 || rawLimit > 200 ||
      !Number.isInteger(rawOffset) || rawOffset < 0 || rawOffset > 100_000) {
    return NextResponse.json({ error: 'Invalid opportunity filters or pagination' }, { status: 400 })
  }
  const type = rawType as OpportunityType | null
  const state = rawState
  const category = rawCategory as UserCategory | null
  const q = searchParams.get('q')?.slice(0, 100).toLowerCase()

  // Try Supabase when configured
  if (isSupabaseConfigured()) {
    try {
      const { createClient } = await import('@supabase/supabase-js')
      const sb = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )
      let query = sb
        .from('opportunities')
        .select('*, eligibility_rules(*), required_documents(*), application_steps(*)')
        .eq('is_active', true)
        .order('deadline', { ascending: true, nullsFirst: false })
        .range(rawOffset, rawOffset + rawLimit - 1)

      if (type) query = query.eq('type', type)
      if (state) query = query.or(`state.eq.${state},state.eq.Pan-India`)

      const { data, error } = await query

      if (!error && data && data.length > 0) {
         
        let results: any[] = data

        // Category filter (array contains)
        if (category) {
          results = results.filter(
            (r: { eligibility_rules?: { allowed_categories?: string[] } }) =>
              !r.eligibility_rules?.allowed_categories ||
              r.eligibility_rules.allowed_categories.length === 0 ||
              r.eligibility_rules.allowed_categories.includes(category)
          )
        }

        // Keyword filter
        if (q) {
          results = results.filter(
            (r: { title?: string; description?: string; issuing_authority?: string; tags?: string[] }) =>
              r.title?.toLowerCase().includes(q) ||
              r.description?.toLowerCase().includes(q) ||
              r.issuing_authority?.toLowerCase().includes(q) ||
              r.tags?.some((t: string) => t.toLowerCase().includes(q))
          )
        }

        const opportunities = results.map(rowToOpportunity)
        return NextResponse.json({ opportunities, total: opportunities.length, source: 'supabase', limit: rawLimit, offset: rawOffset, nextOffset: opportunities.length === rawLimit ? rawOffset + rawLimit : null })
      }
    } catch (err) {
      console.warn('[api/opportunities] Supabase query failed, falling back:', err)
    }
  }

  // Fallback: demo data with server-side filtering
  let results = [...DEMO_OPPORTUNITIES]

  if (type) results = results.filter(o => o.type === type)
  if (state) results = results.filter(o => !o.state || o.state === state || o.state === 'Pan-India')
  if (category) {
    results = results.filter(o =>
      !o.rules.allowedCategories ||
      o.rules.allowedCategories.length === 0 ||
      o.rules.allowedCategories.includes(category)
    )
  }
  if (q) {
    results = results.filter(o =>
      o.title.toLowerCase().includes(q) ||
      o.description.toLowerCase().includes(q) ||
      o.issuingAuthority.toLowerCase().includes(q) ||
      o.tags.some(t => t.toLowerCase().includes(q))
    )
  }

  const page = results.slice(rawOffset, rawOffset + rawLimit)
  return NextResponse.json({ opportunities: page, total: results.length, source: 'demo', limit: rawLimit, offset: rawOffset, nextOffset: rawOffset + page.length < results.length ? rawOffset + page.length : null })
}
