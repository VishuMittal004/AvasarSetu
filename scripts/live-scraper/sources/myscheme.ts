/**
 * MyScheme.gov.in — Government Schemes
 * Uses the website's search page (HTML) + Gemini extraction
 * since the API now requires auth.
 */

import type { RawOpportunity, ScraperIssueReporter } from "../types"

const SCHEME_PAGES = [
  "https://www.myscheme.gov.in/search?keyword=scholarship",
  "https://www.myscheme.gov.in/search?keyword=education",
  "https://www.myscheme.gov.in/search?keyword=employment",
  "https://www.myscheme.gov.in/search?keyword=agriculture",
  "https://www.myscheme.gov.in/search?keyword=startup",
  "https://www.myscheme.gov.in/search?keyword=women",
  "https://www.myscheme.gov.in/search?keyword=health",
]

async function geminiExtractSchemes(html: string, pageUrl: string, geminiKey: string, reportIssue?: ScraperIssueReporter): Promise<RawOpportunity[]> {
  const cleanText = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim()
    .slice(0, 10000)

  const prompt = `Extract all government schemes/yojanas listed on this Indian government page (myscheme.gov.in).

For each scheme found, return JSON:
{
  "schemes": [
    {
      "name": "scheme full name in English",
      "ministry": "which ministry/department runs it",
      "description": "brief 1-2 sentence description",
      "beneficiaries": "who benefits (students, farmers, women, etc.)",
      "benefit": "what benefit (scholarship amount, loan amount, etc.)",
      "eligibility": "eligibility criteria"
    }
  ]
}

Text: ${cleanText}`

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${geminiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: "application/json", temperature: 0.1 },
        }),
        signal: AbortSignal.timeout(25000),
      }
    )
    if (!res.ok) { reportIssue?.(`Gemini HTTP ${res.status} while extracting ${pageUrl}`); return [] }
    const data = await res.json()
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || "{}"
    const parsed = JSON.parse(text)

     
    return (parsed.schemes || []).map((s: any, i: number) => ({
      title: s.name || "Government Scheme",
      description: s.description || `${s.name} — ${s.benefit || ""}`,
      type: "scheme" as const,
      issuingAuthority: s.ministry || "Government of India",
      deadline: null,
      applicationLink: "https://www.myscheme.gov.in",
      sourceUrl: `${pageUrl}#scheme-${i}-${encodeURIComponent((s.name || "").slice(0, 20))}`,
      sourceName: "MyScheme.gov.in",
      sourceType: "government",
      location: "Pan-India",
      salaryOrAmount: s.benefit || undefined,
      tags: ["Government Scheme", s.ministry || "GoI", s.beneficiaries || "Citizens"].filter(Boolean),
      eligibilityText: s.eligibility || s.beneficiaries || "",
    }))
  } catch (error) {
    reportIssue?.(`Gemini extraction failed for ${pageUrl}: ${error instanceof Error ? error.message : String(error)}`)
    return []
  }
}

export async function fetchMyScheme(geminiKey?: string, reportIssue?: ScraperIssueReporter): Promise<RawOpportunity[]> {
  const results: RawOpportunity[] = []

  if (!geminiKey) {
    console.warn("[myscheme] No Gemini key — skipping")
    reportIssue?.("GEMINI_API_KEY is not configured")
    return []
  }

  for (const pageUrl of SCHEME_PAGES) {
    try {
      const res = await fetch(pageUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0",
          "Accept": "text/html",
        },
        signal: AbortSignal.timeout(15000),
      })

      if (!res.ok) { reportIssue?.(`HTTP ${res.status} for ${pageUrl}`); continue }
      const html = await res.text()
      console.log(`[myscheme] ${pageUrl} → ${html.length} chars`)

      const schemes = await geminiExtractSchemes(html, pageUrl, geminiKey, reportIssue)
      results.push(...schemes)
      console.log(`[myscheme] Extracted ${schemes.length} from ${pageUrl}`)

      await new Promise(r => setTimeout(r, 1500)) // rate limit
    } catch (err) {
      console.warn(`[myscheme] Error at ${pageUrl}:`, err)
      reportIssue?.(`${pageUrl}: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  // Deduplicate by title
  const seen = new Set<string>()
  const deduped = results.filter(r => {
    if (seen.has(r.title)) return false
    seen.add(r.title)
    return true
  })

  console.log(`[myscheme] Total: ${deduped.length} unique schemes`)
  return deduped
}
