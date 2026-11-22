import { NextResponse } from 'next/server'
import { SearchService } from '@/services/SearchService'
import { rowToOpportunity } from '@/services/OpportunityService'
import { rateLimit } from '@/lib/ratelimit'
import { DEMO_OPPORTUNITIES } from '@/data/demoOpportunities'
import type { UserProfile } from '@/types'

function normalizeOpportunityTitle(title: string) {
  return title.toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim()
}

function mergeScrapedAndPresentationResults<T extends { opportunity: { title: string } }>(
  scraped: T[],
  presentation: T[],
) {
  const scrapedTitles = new Set(scraped.map(result => normalizeOpportunityTitle(result.opportunity.title)))
  return [
    ...scraped,
    ...presentation.filter(result => !scrapedTitles.has(normalizeOpportunityTitle(result.opportunity.title))),
  ]
}

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
 * POST /api/search
 * Hybrid search: vector similarity + keyword fallback
 *
 * Body: { query: string, profile?: UserProfile, limit?: number }
 * Returns: { results: SearchResult[], source: 'vector' | 'keyword' | 'demo' }
 */
export async function POST(request: Request) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  if (!rateLimit(`search:${ip}`, 30, 60_000)) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 })
  }

  let body: { query: string; profile?: Partial<UserProfile>; limit?: number }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { query, profile, limit = 20 } = body
  if (typeof query !== 'string' || query.trim().length < 2 || query.length > 200) {
    return NextResponse.json({ error: 'query must be between 2 and 200 characters' }, { status: 400 })
  }
  const resultLimit = Number.isInteger(limit) ? Math.max(1, Math.min(limit, 50)) : 20

  // ── 1. Try Supabase vector search (pgvector) ─────────────────────
  if (isSupabaseConfigured()) {
    try {
      const { createClient } = await import('@supabase/supabase-js')
      const sb = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        // Keep service credentials on the server: the embeddings table may not
        // grant anonymous access even though the matching opportunities are public.
        process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )

      // Try to get query embedding from Gemini
      const geminiKey = process.env.GEMINI_API_KEY
      if (geminiKey) {
        const embedRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent?key=${geminiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              model: 'models/gemini-embedding-001',
              content: { parts: [{ text: query }] },
              outputDimensionality: 768,
            }),
          }
        )

        if (embedRes.ok) {
          const embedData = await embedRes.json()
          const embedding: number[] = embedData?.embedding?.values ?? []

          if (embedding.length > 0) {
            // Call pgvector match function in Supabase
            const { data, error } = await sb.rpc('match_opportunities', {
              query_embedding: embedding,
              match_threshold: 0.501,
              match_count: resultLimit,
            })

            if (!error && data && data.length > 0) {
              const ids = data.map((row: { opportunity_id: string }) => row.opportunity_id)
              const { data: rows, error: rowsError } = await sb
                .from('opportunities')
                .select('*, eligibility_rules(*), required_documents(*), application_steps(*)')
                .in('id', ids)
                .eq('is_active', true)
                .eq('is_demo', false)
                .not('id', 'like', 'demo-%')
              if (rowsError) throw rowsError
              const byId = new Map((rows ?? []).map(row => [row.id, rowToOpportunity(row)]))
              const opportunities = ids.flatMap((id: string) => {
                const opportunity = byId.get(id)
                return opportunity ? [opportunity] : []
              })
              const sq = SearchService.parseQuery(query)
              const liveResults = SearchService.search(sq, profile ?? null, opportunities, {
                allowSemanticMatches: true,
                preserveInputOrder: true,
              })
              const demoResults = SearchService.search(sq, profile ?? null, DEMO_OPPORTUNITIES)
              const results = mergeScrapedAndPresentationResults(liveResults, demoResults)
              const limited = results.slice(0, resultLimit)
              return NextResponse.json({ results: limited, total: results.length, source: 'vector+demo' })
            }
          }
        }
      }

      // ── 2. Supabase full-text search (no embeddings yet) ───────────
      let { data: ftData, error: ftError } = await sb
        .from('opportunities')
        .select('*, eligibility_rules(*), required_documents(*), application_steps(*)')
        .textSearch('search_vector', query, { type: 'websearch', config: 'english' })
        .eq('is_active', true)
        .eq('is_demo', false)
        .not('id', 'like', 'demo-%')
        .limit(resultLimit)

      // Existing databases need the search_vector migration. Keep search usable
      // while that migration is pending by falling back to parameterized ILIKE.
      if (ftError || !ftData?.length) {
        const tokens = query.replace(/[^\p{L}\p{N}\s-]/gu, ' ').trim().split(/\s+/).filter(Boolean).slice(0, 8)
        if (tokens.length > 0) {
          const filters = tokens.flatMap(token => {
            const pattern = `*${token}*`
            return [`title.ilike.${pattern}`, `description.ilike.${pattern}`, `issuing_authority.ilike.${pattern}`]
          })
          const fallback = await sb
            .from('opportunities')
            .select('*, eligibility_rules(*), required_documents(*), application_steps(*)')
            .or(filters.join(','))
            .eq('is_active', true)
            .eq('is_demo', false)
            .not('id', 'like', 'demo-%')
            .limit(resultLimit)
          ftData = fallback.data
          ftError = fallback.error
        }
      }

      if (ftError) throw ftError

      if (ftData && ftData.length > 0) {
        const sq = SearchService.parseQuery(query)
        const liveResults = SearchService.search(sq, profile ?? null, ftData.map(rowToOpportunity))
        const demoResults = SearchService.search(sq, profile ?? null, DEMO_OPPORTUNITIES)
        const results = mergeScrapedAndPresentationResults(liveResults, demoResults)
        const limited = results.slice(0, resultLimit)
        return NextResponse.json({ results: limited, total: results.length, source: 'fulltext+demo' })
      }
    } catch (err) {
      console.warn('[api/search] Supabase search failed, falling back to demo:', err)
    }
  }

  // ── 3. Keyword search on demo data ─────────────────────────────────
  const sq = SearchService.parseQuery(query)
  const results = SearchService.search(sq, profile ?? null, DEMO_OPPORTUNITIES)
  return NextResponse.json({
    results: results.slice(0, resultLimit),
    total: results.length,
    source: 'demo',
  })
}

