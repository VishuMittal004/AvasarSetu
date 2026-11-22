import { NextResponse } from 'next/server'
import { z } from 'zod'
import { DEMO_OPPORTUNITIES } from '@/data/demoOpportunities'
import { getGroqClient } from '@/lib/groq'
import { rateLimit } from '@/lib/ratelimit'
import { getDeadlineDaysLeft } from '@/lib/utils'
import { rowToOpportunity } from '@/services/OpportunityService'
import { SearchService } from '@/services/SearchService'
import type { Opportunity, SearchResult, UserProfile } from '@/types'

// Profile records contain null for fields the user has not filled in yet.
// Convert those nulls to undefined so optional validation accepts a partial profile.
const profileField = <T extends z.ZodType>(schema: T) =>
  z.preprocess(value => value === null ? undefined : value, schema.optional())

const profileSchema = z.object({
  age: profileField(z.number().min(14).max(100)),
  dateOfBirth: profileField(z.string().max(40)),
  educationLevel: profileField(z.enum(['below-10th', '10th-pass', '12th-pass', 'undergraduate', 'graduate', 'postgraduate', 'doctorate'])),
  degree: profileField(z.string().max(120)),
  branch: profileField(z.string().max(120)),
  institution: profileField(z.string().max(200)),
  graduationYear: profileField(z.number().int().min(1950).max(2100)),
  employmentStatus: profileField(z.enum(['student', 'unemployed', 'employed', 'self-employed'])),
  yearsOfExperience: profileField(z.number().min(0).max(80)),
  currentRole: profileField(z.string().max(160)),
  category: profileField(z.enum(['General', 'OBC', 'SC', 'ST', 'EWS'])),
  income: profileField(z.number().min(0)),
  state: profileField(z.string().max(100)),
  district: profileField(z.string().max(100)),
  skills: profileField(z.array(z.string().max(80)).max(60)),
  interests: profileField(z.array(z.string().max(100)).max(60)),
  preferredLocations: profileField(z.array(z.string().max(100)).max(30)),
})

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
  const normalize = (value: string) => value.toLocaleLowerCase().normalize('NFKD').replace(/[^\p{L}\p{N}+#]+/gu, '')
  const title = normalize(opportunity.title)
  const tags = normalize(opportunity.tags.join(' '))
  const requirements = normalize([
    opportunity.description,
    opportunity.issuingAuthority,
    ...(opportunity.rules.requiredSkills ?? []),
    ...(opportunity.rules.requiredDegrees ?? []),
    ...(opportunity.rules.requiredBranches ?? []),
  ].join(' '))
  let score = 0

  // A direct skill match should outweigh generic education-policy matches.
  for (const skill of new Set(profile.skills ?? [])) {
    const term = normalize(skill)
    if (term.length > 1 && (title.includes(term) || tags.includes(term) || requirements.includes(term))) score += 22
  }
  for (const value of [profile.degree, profile.branch]) {
    if (!value) continue
    const term = normalize(value)
    if (term.length > 1 && (title.includes(term) || tags.includes(term) || requirements.includes(term))) score += 14
  }
  for (const value of [...(profile.interests ?? []), profile.currentRole, ...(profile.preferredLocations ?? [])]) {
    if (!value) continue
    const term = normalize(value)
    if (term.length > 2 && (title.includes(term) || tags.includes(term) || requirements.includes(term))) score += 5
  }
  return Math.min(score, 100)
}

function deterministicMatches(profile: Partial<UserProfile>, opportunities: Opportunity[]): SearchResult[] {
  const base = { raw: '', keywords: [], filters: {} }
  return SearchService.search(base, profile, opportunities)
    .filter(result => getDeadlineDaysLeft(result.opportunity.deadline) === null || getDeadlineDaysLeft(result.opportunity.deadline)! >= 0)
    // Keep entry-level roles as potential matches when the only uncertain point
    // is completing the user's current undergraduate degree. Other known failures
    // remain excluded, and the UI continues to show eligibility separately.
    .filter(result => {
      if (result.eligibility.failedCriteria.length === 0) return true
      const educationOnlyMismatch = result.eligibility.failedCriteria.length === 1 &&
        result.eligibility.failedCriteria[0] === 'Education' &&
        ['job', 'internship'].includes(result.opportunity.type) &&
        profileRelevanceSignal(result.opportunity, profile) >= 20
      return educationOnlyMismatch
    })
    .sort((a, b) => {
      const aScore = profileRelevanceSignal(a.opportunity, profile) * 3 + a.relevanceScore
      const bScore = profileRelevanceSignal(b.opportunity, profile) * 3 + b.relevanceScore
      return bScore - aScore || eligibilityTier(b) - eligibilityTier(a)
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

  // Keep the provider payload small: the dashboard only displays eight cards,
  // so sending dozens of long records adds latency and can trigger HTTP 413.
  const modelCandidates = candidates.slice(0, 12).map(result => ({
    id: result.opportunity.id,
    title: result.opportunity.title,
    type: result.opportunity.type,
    description: result.opportunity.description.slice(0, 220),
    tags: result.opportunity.tags.slice(0, 6),
    location: result.opportunity.location,
    degreeRequirements: result.opportunity.rules.requiredDegrees?.slice(0, 5),
    branchRequirements: result.opportunity.rules.requiredBranches?.slice(0, 5),
    educationRequirements: result.opportunity.rules.requiredEducation?.slice(0, 5),
    requiredSkills: result.opportunity.rules.requiredSkills?.slice(0, 8),
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
            'Candidates may include entry-level jobs where the only failed profile check is degree completion; keep those as potential matches and do not claim eligibility.',
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
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'opportunity_rankings',
          strict: true,
          schema: {
            type: 'object',
            properties: {
              rankings: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    score: { type: 'integer' },
                    reason: { type: 'string' },
                  },
                  required: ['id', 'score', 'reason'],
                  additionalProperties: false,
                },
              },
            },
            required: ['rankings'],
            additionalProperties: false,
          },
        },
      },
      reasoning_format: 'hidden',
      reasoning_effort: 'low',
      max_completion_tokens: 1200,
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
    const providerError = typeof error === 'object' && error !== null
      ? error as { status?: unknown; code?: unknown; type?: unknown; message?: unknown; name?: unknown }
      : null
    const details = {
      status: Number(providerError?.status) || null,
      code: providerError?.code ?? null,
      type: providerError?.type ?? null,
      name: providerError?.name ?? null,
      message: typeof providerError?.message === 'string' ? providerError.message.slice(0, 300) : String(error).slice(0, 300),
    }
    console.warn(`[api/recommendations] AI ranking unavailable; using rules ranking: ${JSON.stringify(details)}`)
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
    return NextResponse.json({
      error: 'Profile details could not be read.',
      fields: parsedBody.error.issues.map(issue => issue.path.join('.')),
    }, { status: 400 })
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
      const aFit = profileRelevanceSignal(a.opportunity, profile)
      const bFit = profileRelevanceSignal(b.opportunity, profile)
      const aRank = aFit * 0.65 + (a.matchScore ?? a.relevanceScore) * 0.35 + eligibilityTier(a) * 3
      const bRank = bFit * 0.65 + (b.matchScore ?? b.relevanceScore) * 0.35 + eligibilityTier(b) * 3
      return bRank - aRank || eligibilityTier(b) - eligibilityTier(a)
    })
    .slice(0, 8)

  return NextResponse.json(
    { results, source: aiRankings ? 'ai' : 'rules' },
    { headers: { 'Cache-Control': 'no-store' } },
  )
}
