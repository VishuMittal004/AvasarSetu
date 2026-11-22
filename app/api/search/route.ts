import { NextResponse } from 'next/server'
import { DEMO_OPPORTUNITIES } from '@/data/demoOpportunities'
import { rateLimit } from '@/lib/ratelimit'
import { SearchService } from '@/services/SearchService'
import { rowToOpportunity } from '@/services/OpportunityService'
import type { Opportunity, SearchResult, SearchQuery, UserProfile } from '@/types'

const MAX_CANDIDATES = 1000
const MIN_VECTOR_SIMILARITY = 0.64

const STOP_WORDS = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from', 'get', 'have', 'i',
  'in', 'is', 'it', 'me', 'my', 'of', 'on', 'or', 'please', 'show', 'that', 'the',
  'to', 'want', 'with', 'looking', 'find', 'opportunity', 'opportunities', 'job', 'jobs',
  'government', 'govt', 'private', 'exam', 'exams', 'scheme', 'schemes', 'scholarship',
  'scholarships', 'graduate', 'graduation', 'undergraduate', 'postgraduate', 'degree',
])

function normalize(value: string): string {
  return value.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim()
}

function compact(value: string): string {
  return normalize(value).replace(/\s+/g, '')
}

function getTerms(rawQuery: string, parsed: SearchQuery): string[] {
  const rawTokens = normalize(rawQuery).split(/\s+/).filter(token => token.length > 2 && !STOP_WORDS.has(token))
  const profileTerms = [parsed.profileHints?.degree, parsed.profileHints?.branch, ...(parsed.profileHints?.skills ?? [])]
  const base = [...parsed.keywords, ...rawTokens, ...profileTerms.filter((term): term is string => Boolean(term))]
  const expanded = base.flatMap(term => {
    const token = normalize(term)
    if (token === 'fullstack') return ['fullstack', 'full stack', 'developer']
    if (token === 'banking') return ['banking', 'bank']
    if (token === 'railways') return ['railways', 'railway', 'rrb']
    if (token === 'railway') return ['railway', 'railways', 'rrb']
    return [term]
  })
  return [...new Set(expanded.map(normalize).filter(term => term.length > 1))]
}

function lexicalScore(opportunity: Opportunity, rawQuery: string, terms: string[]): number {
  const title = normalize(opportunity.title)
  const titleCompact = compact(opportunity.title)
  const query = normalize(rawQuery)
  const queryCompact = compact(rawQuery)
  const authority = normalize(opportunity.issuingAuthority)
  const tags = normalize(opportunity.tags.join(' '))
  const details = normalize([
    opportunity.description,
    opportunity.location,
    opportunity.state,
    opportunity.rules.requiredDegrees?.join(' '),
    opportunity.rules.requiredBranches?.join(' '),
    opportunity.rules.requiredSkills?.join(' '),
  ].filter(Boolean).join(' '))

  let score = 0
  if (query.length >= 4 && title.includes(query)) score += 40
  else if (queryCompact.length >= 5 && titleCompact.includes(queryCompact)) score += 36
  if (query.length >= 5 && normalize(opportunity.description).includes(query)) score += 12

  for (const term of terms) {
    const termCompact = compact(term)
    if (title.includes(term) || (termCompact.length >= 4 && titleCompact.includes(termCompact))) score += 14
    else if (tags.includes(term)) score += 9
    else if (authority.includes(term)) score += 5
    else if (details.includes(term)) score += 3
  }

  return score
}

function hasExplicitFilter(query: SearchQuery): boolean {
  return Boolean(
    query.intent || query.filters.type?.length || query.filters.category?.length ||
    query.filters.education?.length || query.filters.location?.length || query.filters.degree?.length ||
    query.filters.demoSection
  )
}

async function getSemanticScores(supabase: any, rawQuery: string): Promise<Map<string, number>> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) return new Map()

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'models/gemini-embedding-001',
          content: { parts: [{ text: rawQuery }] },
          outputDimensionality: 768,
        }),
        signal: AbortSignal.timeout(8000),
      },
    )
    if (!response.ok) {
      console.warn('[api/search] Gemini embedding unavailable:', response.status)
      return new Map()
    }

    const payload = await response.json()
    const embedding: number[] = payload?.embedding?.values ?? []
    if (embedding.length !== 768) return new Map()

    const { data, error } = await supabase.rpc('match_opportunities', {
      query_embedding: embedding,
      match_threshold: MIN_VECTOR_SIMILARITY,
      match_count: 100,
    })
    if (error) {
      console.warn('[api/search] Vector lookup unavailable:', error.message)
      return new Map()
    }

    return new Map(
      (data ?? [])
        .filter((row: { similarity: number }) => Number(row.similarity) >= MIN_VECTOR_SIMILARITY)
        .map((row: { opportunity_id: string; similarity: number }) => [row.opportunity_id, Number(row.similarity)]),
    )
  } catch (error) {
    console.warn('[api/search] Semantic search failed; using lexical ranking:', error instanceof Error ? error.name : 'unknown')
    return new Map()
  }
}

function rankCandidates(
  rawQuery: string,
  parsed: SearchQuery,
  profile: Partial<UserProfile> | null,
  opportunities: Opportunity[],
  semanticScores: Map<string, number>,
  limit: number,
): SearchResult[] {
  const terms = getTerms(rawQuery, parsed)
  const explicitFilter = hasExplicitFilter(parsed)
  const scored = opportunities
    .map(opportunity => {
      const lexical = lexicalScore(opportunity, rawQuery, terms)
      const semantic = semanticScores.get(opportunity.id) ?? 0
      const filterOnlyMatch = explicitFilter && lexical === 0 && semantic < MIN_VECTOR_SIMILARITY
      return { opportunity, lexical, semantic, filterOnlyMatch }
    })
    .filter(candidate => candidate.lexical > 0 || candidate.semantic >= MIN_VECTOR_SIMILARITY || candidate.filterOnlyMatch)

  const searchResults = SearchService.search(
    parsed,
    profile,
    scored.map(candidate => candidate.opportunity),
    { allowSemanticMatches: true },
  )
  const scoreById = new Map(scored.map(candidate => [candidate.opportunity.id, candidate]))

  return searchResults
    .map(result => {
      const candidate = scoreById.get(result.opportunity.id)!
      const semanticBoost = candidate.semantic >= MIN_VECTOR_SIMILARITY
        ? Math.round((candidate.semantic - MIN_VECTOR_SIMILARITY) * 100)
        : 0
      const filterBoost = candidate.filterOnlyMatch ? 4 : 0
      return {
        ...result,
        relevanceScore: result.relevanceScore + candidate.lexical * 2 + semanticBoost + filterBoost,
      }
    })
    .sort((a, b) => {
      if (profile && Object.keys(profile).length > 0) {
        const eligibilityRank = (result: SearchResult) => result.eligibility.isEligible ? 2 : result.eligibility.isPartiallyEligible ? 1 : 0
        const difference = eligibilityRank(b) - eligibilityRank(a)
        if (difference !== 0) return difference
      }
      return b.relevanceScore - a.relevanceScore
    })
    .slice(0, limit)
}

function mergeByTitle(live: SearchResult[], presentation: SearchResult[]): SearchResult[] {
  const seen = new Set(live.map(result => compact(result.opportunity.title)))
  return [...live, ...presentation.filter(result => !seen.has(compact(result.opportunity.title)))]
}

export async function POST(request: Request) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  if (!rateLimit(`search:${ip}`, 30, 60_000)) {
    return NextResponse.json({ error: 'Search limit reached. Wait a minute and try again.' }, { status: 429 })
  }

  let body: { query?: unknown; profile?: Partial<UserProfile>; limit?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid search request.' }, { status: 400 })
  }

  const rawQuery = typeof body.query === 'string' ? body.query.trim() : ''
  if (rawQuery.length < 2 || rawQuery.length > 200) {
    return NextResponse.json({ error: 'Enter a search between 2 and 200 characters.' }, { status: 400 })
  }
  const limit = typeof body.limit === 'number' && Number.isInteger(body.limit) ? Math.max(1, Math.min(body.limit, 50)) : 20
  const profile = body.profile ?? null
  const parsed = SearchService.parseQuery(rawQuery)

  let liveOpportunities: Opportunity[] = []
  let semanticScores = new Map<string, number>()
  let supabaseReady = false

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const publicKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (supabaseUrl?.startsWith('https://') && publicKey && !publicKey.includes('placeholder')) {
    try {
      const { createClient } = await import('@supabase/supabase-js')
      const supabase = createClient(
        supabaseUrl,
        process.env.SUPABASE_SERVICE_ROLE_KEY || publicKey,
        { auth: { autoRefreshToken: false, persistSession: false } },
      )
      const { data, error } = await supabase
        .from('opportunities')
        .select('*, eligibility_rules(*), required_documents(*), application_steps(*)')
        .eq('is_active', true)
        .eq('is_demo', false)
        .not('id', 'like', 'demo-%')
        .limit(MAX_CANDIDATES)

      if (error) throw error
      liveOpportunities = (data ?? []).map(rowToOpportunity)
      supabaseReady = true
      semanticScores = await getSemanticScores(supabase, rawQuery)
    } catch (error) {
      console.warn('[api/search] Catalogue lookup failed; using local presentation listings:', error instanceof Error ? error.message : 'unknown')
    }
  }

  const liveResults = rankCandidates(rawQuery, parsed, profile, liveOpportunities, semanticScores, limit)
  const presentationResults = rankCandidates(rawQuery, parsed, profile, DEMO_OPPORTUNITIES, new Map(), limit)
  const results = mergeByTitle(liveResults, presentationResults).slice(0, limit)
  const source = semanticScores.size > 0 ? 'hybrid' : supabaseReady ? 'keyword' : 'presentation'

  return NextResponse.json({ results, total: results.length, source }, { headers: { 'Cache-Control': 'no-store' } })
}
