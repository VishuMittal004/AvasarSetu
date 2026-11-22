/**
 * Govt Jobs — confirmed scrapeable sources only:
 *   RSS:  SarkariResult, FreeJobAlert
 *   HTML: IndGovtJobs, IBPS, UPSC, eShram, India.gov.in
 */

import type { RawOpportunity, ScraperIssueReporter } from "../types"
import { parseSourceDate } from "../date"

// ── RSS Parser ────────────────────────────────────────────────────
function parseRss(xml: string): Array<{ title: string; link: string; description: string; pubDate: string }> {
  return [...xml.matchAll(/<item>([\s\S]*?)<\/item>/gi)].map(m => {
    const b = m[1]
    const get = (tag: string) =>
      (b.match(new RegExp(`<${tag}><\\!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>`))?.[1] ||
       b.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`))?.[1] || "").trim()
    return { title: get("title"), link: get("link"), description: get("description").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim(), pubDate: get("pubDate") }
  }).filter(i => i.title.length > 3)
}

// ── RSS Item → RawOpportunity ─────────────────────────────────────
function rssToRaw(item: ReturnType<typeof parseRss>[0], sourceName: string): RawOpportunity | null {
  const title = item.title
  if (!title) return null
  // Skip admit cards, results, answer keys, merit lists
  if (/admit.?card|result|cut.?off|merit.?list|answer.?key|syllabus/i.test(title)) return null

  let type: RawOpportunity["type"] = "job"
  if (/exam|test|cbt|written|cgl|chsl|cpo|mts/i.test(title)) type = "exam"
  else if (/scholarship|fellowship/i.test(title)) type = "scholarship"
  else if (/scheme|yojana/i.test(title)) type = "scheme"

  const org = title.split(/\s(?:recruitment|notification|online|form|post|vacancy|apply)\s/i)[0].trim().slice(0, 80)

  // Try to extract last date
  const dateMatch = item.description.match(/(?:last date|closing date)[:\s]+(\d{1,2}[-\/]\w+[-\/]\d{2,4})/i)?.[1] ||
                    item.description.match(/(\d{2}[-\/]\d{2}[-\/]\d{4})/)?.[1]
  const deadline = parseSourceDate(dateMatch)

  const vacancyMatch = item.description.match(/(\d[\d,]+)\s*(?:post|vacancy|vacancies|seat)/i)
  const vacancyCount = vacancyMatch ? parseInt(vacancyMatch[1].replace(",", "")) : undefined

  return {
    title: title.slice(0, 200),
    description: (item.description || `${title}. Apply now.`).slice(0, 500),
    type, issuingAuthority: org,
    deadline,
    applicationLink: item.link || `https://${sourceName.toLowerCase().replace(/\s/g, "")}.com`,
    sourceUrl: item.link || `${sourceName}#${encodeURIComponent(title.slice(0, 40))}`,
    sourceName, sourceType: "government",
    location: "Pan-India",
    vacancyCount,
    tags: ["Government", type === "exam" ? "Exam" : "Recruitment", org].filter(Boolean),
    eligibilityText: "",
  }
}

// ── Gemini HTML Extractor ─────────────────────────────────────────
async function geminiExtract(html: string, pageUrl: string, siteName: string, jobType: string, geminiKey: string, reportIssue?: ScraperIssueReporter): Promise<RawOpportunity[]> {
  const text = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&").replace(/&nbsp;/g, " ").replace(/&#\d+;/g, " ")
    .replace(/\s{2,}/g, " ").trim().slice(0, 9000)

  const prompt = `Extract all ${jobType} listings from ${siteName} (${pageUrl}).
Return ONLY valid JSON:
{
  "items": [
    {
      "title": "exact title",
      "organization": "issuing body",
      "type": "job|exam|scholarship|scheme|internship",
      "deadline": "YYYY-MM-DD or null",
      "vacancies": number or null,
      "salary": "pay scale or null",
      "eligibility": "brief criteria",
      "applyLink": "URL or null",
      "location": "city/state or Pan-India",
      "description": "1-2 sentence summary"
    }
  ]
}
Only include items with both title AND organization. Skip admit cards, results, merit lists. Max 15 items.

Page text:
${text}`

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${geminiKey}`,
      {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: "application/json", temperature: 0.0 },
        }),
        signal: AbortSignal.timeout(25000),
      }
    )
    if (!res.ok) { reportIssue?.(`Gemini HTTP ${res.status} while extracting ${pageUrl}`); return [] }
    const data = await res.json()
    const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text || "{}"
     
    const parsed: { items?: any[] } = JSON.parse(raw)
     
    return (parsed.items || []).filter((i: any) => i.title && i.organization).map((item: any, idx: number): RawOpportunity => ({
      title: item.title,
      description: item.description || `${item.title} from ${item.organization}`,
      type: (["job","exam","scholarship","scheme","internship"].includes(item.type) ? item.type : "job") as RawOpportunity["type"],
      issuingAuthority: item.organization,
      deadline: parseSourceDate(item.deadline),
      applicationLink: item.applyLink || pageUrl,
      sourceUrl: `${pageUrl}#item-${idx}-${Buffer.from(item.title.slice(0,20)).toString("base64").slice(0,12)}`,
      sourceName: siteName, sourceType: "government",
      location: item.location || "Pan-India",
      salaryOrAmount: item.salary || undefined,
      vacancyCount: item.vacancies || undefined,
      tags: [item.organization, item.type === "exam" ? "Exam" : "Recruitment", "Government"],
      eligibilityText: item.eligibility || "",
    }))
  } catch (error) { reportIssue?.(`Gemini extraction failed for ${pageUrl}: ${error instanceof Error ? error.message : String(error)}`); return [] }
}

async function fetchHTML(url: string, reportIssue?: ScraperIssueReporter): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml;q=0.9,*/*;q=0.8",
      },
      signal: AbortSignal.timeout(18000),
    })
    if (!res.ok) { reportIssue?.(`HTTP ${res.status} for ${url}`); return null }
    return res.text()
  } catch (error) { reportIssue?.(`${url}: ${error instanceof Error ? error.message : String(error)}`); return null }
}

// ── Confirmed RSS Sources ─────────────────────────────────────────
const RSS_SOURCES = [
  { url: "https://www.sarkariresult.com/feed/",   name: "SarkariResult" },
  { url: "https://www.freejobalert.com/feed/",    name: "FreeJobAlert" },
]

// ── Confirmed HTML Sources ────────────────────────────────────────
const HTML_SOURCES = [
  { url: "https://www.indgovtjobs.in/",                       name: "IndGovtJobs",    jobType: "government job/exam recruitment notifications" },
  { url: "https://www.ibps.in/",                              name: "IBPS",           jobType: "banking exam and job recruitment notifications" },
  { url: "https://www.upsc.gov.in/recruitments",              name: "UPSC",           jobType: "civil services exam and recruitment notifications" },
  { url: "https://eshram.gov.in/employment-schemes",          name: "eShram",         jobType: "employment scheme and welfare scheme listings" },
  { url: "https://www.india.gov.in/category/jobs",            name: "India.gov.in",   jobType: "government job and employment notifications" },
]

export async function fetchGovtJobsViaGemini(geminiKey: string, reportIssue?: ScraperIssueReporter): Promise<RawOpportunity[]> {
  const results: RawOpportunity[] = []

  // ── 1. RSS Feeds (fastest, no Gemini needed) ──────────────────
  for (const { url, name } of RSS_SOURCES) {
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": "Mozilla/5.0", "Accept": "application/rss+xml, application/xml" },
        signal: AbortSignal.timeout(12000),
      })
      if (!res.ok) { console.warn(`[${name}-rss] HTTP ${res.status}`); reportIssue?.(`${name} RSS HTTP ${res.status}`); continue }
      const xml = await res.text()
      const items = parseRss(xml)
      let converted = 0
      for (const item of items) {
        const raw = rssToRaw(item, name)
        if (raw) { results.push(raw); converted++ }
      }
      console.log(`[${name}-rss] ${items.length} items → ${converted} opportunities`)
    } catch (err) { console.warn(`[${name}-rss] Error:`, err); reportIssue?.(`${name} RSS: ${err instanceof Error ? err.message : String(err)}`) }
  }

  // ── 2. HTML Sources with Gemini ───────────────────────────────
  for (const { url, name, jobType } of HTML_SOURCES) {
    try {
      const html = await fetchHTML(url, reportIssue)
      if (!html) { console.warn(`[${name}] Failed to fetch`); continue }
      console.log(`[${name}] Fetched ${html.length} chars, extracting...`)
      const items = await geminiExtract(html, url, name, jobType, geminiKey, reportIssue)
      results.push(...items)
      console.log(`[${name}] Extracted ${items.length} items`)
      await new Promise(r => setTimeout(r, 1200)) // rate limit
    } catch (err) { console.warn(`[${name}] Error:`, err); reportIssue?.(`${name}: ${err instanceof Error ? err.message : String(err)}`) }
  }

  console.log(`[govt-scraper] Total: ${results.length}`)
  return results
}
