import { NextResponse } from 'next/server'
import { z } from 'zod'
import { DEMO_OPPORTUNITIES } from '@/data/demoOpportunities'
import { getGroqClient } from '@/lib/groq'
import { rateLimit } from '@/lib/ratelimit'
import { getDeadlineDaysLeft } from '@/lib/utils'
import { rowToOpportunity } from '@/services/OpportunityService'
import { SearchService } from '@/services/SearchService'
import type { Opportunity, SearchResult, UserProfile } from '@/types'

const profileSchema = z.object({
  age: z.number().min(14).max(100).optional(),
  dateOfBirth: z.string().max(40).optional(),
  educationLevel: z.enum(['below-10th', '10th-pass', '12th-pass', 'undergraduate', 'graduate', 'postgraduate', 'doctorate']).optional(),
  degree: z.string().max(120).optional(),
  branch: z.string().max(120).optional(),
  institution: z.string().max(200).optional(),
  graduationYear: z.number().int().min(1950).max(2100).optional(),
  employmentStatus: z.enum(['student', 'unemployed', 'employed', 'self-employed']).optional(),
  yearsOfExperience: z.number().min(0).max(80).optional(),
  currentRole: z.string().max(160).optional(),
  category: z.enum(['General', 'OBC', 'SC', 'ST', 'EWS']).optional(),
  income: z.number().min(0).optional(),
  state: z.string().max(100).optional(),
  district: z.string().max(100).optional(),
  skills: z.array(z.string().max(80)).max(60).optional(),
  interests: z.array(z.string().max(100)).max(60).optional(),
  preferredLocations: z.array(z.string().max(100)).max(30).optional(),
}).partial()

const modelResponseSchema = z.object({
  rankings: z.array(z.object({
    id: z.string().min(1).max(200),
    score: z.number().int().min(0).max(100),
    reason: z.string().trim().min(1).max(180),
  }).strict()).max(50),
}).strict()

type DashboardMatch = SearchResult & { matchScore?: number; matchReason?: string }

function compact(value: string): string {
  return value.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '')
}

function mergeListings(live: Opportunity[], presentation: Opportunity[]): Opportunity[] {
  const seen = new Set(live.map(opportunity => compact(opportunity.title)))
  return [...live, ...presentation.filter(opportunity => !seen.has(compact(opportunity.title)))]
}

async function loadOpportunities(): Promise<Opportunity[]> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  let live: Opportunity[] = []

  if (url?.startsWith('https://') && key && !key.includes('placeholder')) {
    try {
      const { createClient } = await import('@supabase/supabase-js')
      const supabase = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
      const { data, error } = await supabase
        .from('opportunities')
        .select('*, eligibility_rules(*), required_documents(*), application_steps(*)')
        .eq('is_active', true)
        .eq('is_demo', false)
        .not('id', 'like', 'demo-%')
        .limit(500)
      if (error) throw error
      live = (data ?? []).map(rowToOpportunity)
    } catch (error) {
      console.warn('[api/recommendations] Catalogue unavailable; using presentation listings:', error instanceof Error ? error.message : 'unknown')
    }
  }

  return mergeListings(live, DEMO_OPPORTUNITIES)
}

function eligibilityTier(result: SearchResult): number {
  if (result.eligibility.isEligible) return 3
  if (result.eligibility.failedCriteria.length > 0) return 0
  if (result.eligibility.isPartiallyEligible) return 2
  return 1
}

function profileRelevanceSignal(opportunity: Opportunity, profile: Partial<UserProfile>): number {
  const profileTerms = [
    ...(profile.skills ?? []),
    ...(profile.interests ?? []),
    profile.degree,
    profile.branch,
    profile.institution,
    profile.currentRole,
    ...(profile.preferredLocations ?? []),
  ].filter((value): value is string => Boolean(value))
    .flatMap(value => value.toLowerCase().split(/[^\p{L}\p{N}+#.]+/u))
    .filter(term => term.length > 1)

  const title = opportunity.title.toLowerCase()
  const tags = opportunity.tags.join(' ').toLowerCase()
  const description = `${opportunity.description} ${opportunity.issuingAuthority} ${opportunity.rules.requiredSkills?.join(' ') ?? ''} ${opportunity.rules.requiredDegrees?.join(' ') ?? ''} ${opportunity.rules.requiredBranches?.join(' ') ?? ''}`.toLowerCase()
  let score = 0
  for (const term of new Set(profileTerms)) {
    if (title.includes(term)) score += 8
    else if (tags.includes(term)) score += 5
    else if (description.includes(term)) score += 2
  }
  return score
}

function deterministicMatches(profile: Partial<UserProfile>, opportunities: Opportunity[]): SearchResult[] {
  const base = { raw: '', keywords: [], filters: {} }
  return SearchService.search(base, profile, opportunities)
    .filter(result => getDeadlineDaysLeft(result.opportunity.deadline) === null || getDeadlineDaysLeft(result.opportunity.deadline)! >= 0)
    // A known failed requirement must not be presented as a recommendation.
    .filter(result => result.eligibility.failedCriteria.length === 0)
    .sort((a, b) => {
      const tierDifference = eligibilityTier(b) - eligibilityTier(a)
      const aScore = profileRelevanceSignal(a.opportunity, profile) * 3 + a.relevanceScore
      const bScore = profileRelevanceSignal(b.opportunity, profile) * 3 + b.relevanceScore
      return tierDifference || bScore - aScore
    })
}

function safeProfileForModel(profile: Partial<UserProfile>) {
  // Do not send direct identifiers, birth date, category, or income to the AI.
  return {
    educationLevel: profile.educationLevel,
    degree: profile.degree,
    branch: profile.branch,
    institution: profile.institution,
    graduationYear: profile.graduationYear,
    employmentStatus: profile.employmentStatus,
    yearsOfExperience: profile.yearsOfExperience,
    currentRole: profile.currentRole,
    skills: profile.skills,
    interests: profile.interests,
    state: profile.state,
    district: profile.district,
    preferredLocations: profile.preferredLocations,
  }
}

async function aiRank(
  profile: Partial<UserProfile>,
  candidates: SearchResult[],
): Promise<Map<string, { score: number; reason: string }> | null> {
  const groq = getGroqClient()
  if (!groq || candidates.length === 0) return null

  const modelCandidates = candidates.slice(0, 40).map(result => ({
    id: result.opportunity.id,
    title: result.opportunity.title,
    type: result.opportunity.type,
    authority: result.opportunity.issuingAuthority,
    description: result.opportunity.description.slice(0, 450),
    tags: result.opportunity.tags.slice(0, 12),
    location: result.opportunity.location,
    degreeRequirements: result.opportunity.rules.requiredDegrees,
    branchRequirements: result.opportunity.rules.requiredBranches,
    educationRequirements: result.opportunity.rules.requiredEducation,
    requiredSkills: result.opportunity.rules.requiredSkills,
    eligibilityStatus: result.eligibility.isEligible ? 'rules indicate eligible'
      : result.eligibility.isPartiallyEligible ? 'some profile criteria match; no known failures'
        : result.eligibility.isUnknown ? 'eligibility is unknown from the recorded rules' : 'not eligible',
  }))

  try {
    const completion = await groq.chat.completions.create({
      model: 'openai/gpt-oss-20b',
      messages: [
        {
          role: 'system',
          content: [
            'Rank opportunities for relevance to the supplied profile.',
            'Use education, degree, branch, skills, interests, career experience, and locations when explicitly present.',
            'An opportunity with a known failed eligibility requirement will not be included in the candidates.',
            'Do not decide or claim legal eligibility; the supplied eligibilityStatus comes from the deterministic rules engine.',
            'Do not invent profile facts or opportunity requirements. Give a short reason grounded in the candidate data.',
            'Return only JSON with a rankings array. Include each candidate id at most once, score as an integer from 0 to 100, and reason no longer than 20 words.',
          ].join(' '),
        },
        {
          role: 'user',
          content: JSON.stringify({ profile: safeProfileForModel(profile), opportunities: modelCandidates }),
        },
      ],
      response_format: { type: 'json_object' },
      max_tokens: 2200,
      temperature: 0,
    })

    const content = completion.choices[0]?.message?.content
    if (!content) return null
    const parsed = modelResponseSchema.safeParse(JSON.parse(content))
    if (!parsed.success) return null
    const candidateIds = new Set(modelCandidates.map(candidate => candidate.id))
    return new Map(parsed.data.rankings
      .filter(item => candidateIds.has(item.id))
      .map(item => [item.id, { score: item.score, reason: item.reason }]))
  } catch (error) {
    const status = typeof error === 'object' && error !== null && 'status' in error ? Number(error.status) : undefined
    console.warn('[api/recommendations] AI ranking unavailable; using rules ranking:', status ?? (error instanceof Error ? error.name : 'unknown'))
    return null
  }
}

export async function POST(request: Request) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  if (!rateLimit(`recommendations:${ip}`, 10, 60_000)) {
    return NextResponse.json({ error: 'Recommendation refresh limit reached. Wait a minute and try again.' }, { status: 429 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid recommendation request.' }, { status: 400 })
  }

  const parsedBody = z.object({ profile: profileSchema.nullable().optional() }).safeParse(body)
  if (!parsedBody.success) {
    return NextResponse.json({ error: 'Profile details could not be read.' }, { status: 400 })
  }

  const profile = (parsedBody.data.profile ?? {}) as Partial<UserProfile>
  const opportunities = await loadOpportunities()
  const candidates = deterministicMatches(profile, opportunities).slice(0, 40)
  const aiRankings = await aiRank(profile, candidates)
  const rankedResults: DashboardMatch[] = candidates.map(result => {
      const ai = aiRankings?.get(result.opportunity.id)
      return ai
        ? { ...result, matchScore: ai.score, matchReason: ai.reason }
        : result
    })
  const results = rankedResults.sort((a, b) => {
      const tierDifference = eligibilityTier(b) - eligibilityTier(a)
      return tierDifference || (b.matchScore ?? -1) - (a.matchScore ?? -1) || b.relevanceScore - a.relevanceScore
    })
    .slice(0, 8)

  return NextResponse.json(
    { results, source: aiRankings ? 'ai' : 'rules' },
    { headers: { 'Cache-Control': 'no-store' } },
  )
}
