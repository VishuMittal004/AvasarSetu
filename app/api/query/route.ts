import { NextResponse } from 'next/server'
import { DEMO_OPPORTUNITIES } from '@/data/demoOpportunities'
import { SearchService } from '@/services/SearchService'
import { QueryParser } from '@/services/QueryParser'
import { getGroqClient } from '@/lib/groq'
import { rateLimit } from '@/lib/ratelimit'
import type { UserProfile, OpportunityType, UserCategory, EducationLevel } from '@/types'

interface ParsedIntent {
  type: OpportunityType | null
  keywords: string[]
  state: string | null
  category: UserCategory | null
  education: EducationLevel | null
}

async function parseWithGroq(text: string): Promise<ParsedIntent | null> {
  const groq = getGroqClient()
  if (!groq) return null

  try {
    const completion = await groq.chat.completions.create({
      model: 'openai/gpt-oss-20b',
      messages: [
        {
          role: 'system',
          content: `You are AvasarSetu's intent parser for Indian career/education queries. Extract: type (one of: job|scholarship|scheme|exam|subsidy|internship|null), keywords (array of strings, max 5), state (Indian state name or null), category (General|OBC|SC|ST|EWS|null), education (graduate|postgraduate|12th-pass|10th-pass|doctorate|null). Return ONLY valid JSON with these exact keys.`,
        },
        {
          role: 'user',
          content: `Query: "${text}"`,
        },
      ],
      response_format: { type: 'json_object' },
      max_tokens: 200,
      temperature: 0,
    })
    return JSON.parse(completion.choices[0].message.content ?? '{}') as ParsedIntent
  } catch {
    return null
  }
}

export async function POST(request: Request) {
  const ip = request.headers.get('x-forwarded-for') ?? 'unknown'
  if (!rateLimit(`query:${ip}`, 30, 60000)) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 })
  }

  let body: { text: string; profile?: Partial<UserProfile> }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { text, profile } = body
  if (!text || typeof text !== 'string') {
    return NextResponse.json({ error: 'text is required' }, { status: 400 })
  }

  // Try LLM parsing first, fall back to keyword parser
  const llmIntent = await parseWithGroq(text)
  const fallbackQuery = QueryParser.parse(text)

  const searchQuery = {
    raw: text,
    intent: (llmIntent?.type ?? fallbackQuery.intent) as OpportunityType | undefined,
    keywords: llmIntent ? [...new Set([...llmIntent.keywords, ...fallbackQuery.keywords])] : fallbackQuery.keywords,
    filters: {
      type: llmIntent?.type ? [llmIntent.type] : (fallbackQuery.filters.type ?? []),
      location: llmIntent?.state ? [llmIntent.state] : (fallbackQuery.filters.location ?? []),
      category: llmIntent?.category ? [llmIntent.category] : (fallbackQuery.filters.category ?? []),
      education: llmIntent?.education ? [llmIntent.education] : (fallbackQuery.filters.education ?? []),
      degree: fallbackQuery.filters.degree,
      demoSection: fallbackQuery.filters.demoSection,
    },
    profileHints: fallbackQuery.profileHints,
  }

  // Use Supabase data if configured, else demo data
  let opportunities = DEMO_OPPORTUNITIES
  const sbUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
  const sbKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''
  const isReal = sbUrl.startsWith('https://') && !sbUrl.includes('placeholder') && !sbUrl.includes('your-project') && sbKey.length > 20 && !sbKey.includes('placeholder')
  if (isReal) {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}/api/opportunities`)
      if (res.ok) {
        const json = await res.json()
        if (Array.isArray(json.opportunities) && json.opportunities.length > 0) {
          opportunities = [...json.opportunities, ...DEMO_OPPORTUNITIES]
        }
      }
    } catch { /* use demo */ }
  }

  const results = SearchService.search(searchQuery, profile ?? null, opportunities)

  // Generate a brief explanation
  let explanation: string | undefined
  const groq = getGroqClient()
  if (groq && results.length > 0) {
    try {
      const topTitles = results.slice(0, 3).map(r => r.opportunity.title).join(', ')
      const exp = await groq.chat.completions.create({
        model: 'openai/gpt-oss-20b',
        messages: [
          { role: 'system', content: 'You are AvasarSetu. Write one friendly sentence (max 25 words) summarizing what was found for the user. Do not make up details.' },
          { role: 'user', content: `Query: "${text}". Top results: ${topTitles}. Total found: ${results.length}.` },
        ],
        max_tokens: 60,
        temperature: 0.3,
      })
      explanation = exp.choices[0].message.content ?? undefined
    } catch {}
  }

  return NextResponse.json({
    intent: searchQuery.intent,
    opportunities: results.slice(0, 20),
    explanation,
    total: results.length,
  })
}
