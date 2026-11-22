import { NextResponse } from 'next/server'
import { DEMO_OPPORTUNITIES } from '@/data/demoOpportunities'
import { rowToOpportunity } from '@/services/OpportunityService'

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

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  // Try Supabase first
  if (isSupabaseConfigured()) {
    try {
      const { createClient } = await import('@supabase/supabase-js')
      const sb = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )
      const { data, error } = await sb
        .from('opportunities')
        .select(`
          *,
          eligibility_rules(*),
          required_documents(*),
          application_steps(*)
        `)
        .eq('id', id)
        .single()

      if (!error && data) {
        const opp = rowToOpportunity(data)
        return NextResponse.json({ opportunity: opp })
      }
    } catch (err) {
      console.warn('[api/opportunities/[id]] Supabase fetch failed:', err)
    }
  }

  // Fallback to demo data
  const opportunity = DEMO_OPPORTUNITIES.find(o => o.id === id)
  if (!opportunity) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  return NextResponse.json({ opportunity })
}
