/**
 * Internshala + private job boards — all confirmed scrapeable.
 * Sources: Internshala (HTML), Foundit, Wellfound, Cutshort, Hirist, Apna
 */

import type { RawOpportunity, ScraperIssueReporter } from "../types"
import { parseSourceDate } from "../date"

async function fetchHTML(url: string, reportIssue?: ScraperIssueReporter): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,*/*;q=0.8",
        "Accept-Language": "en-IN,en;q=0.9",
      },
      signal: AbortSignal.timeout(18000),
    })
    if (!res.ok) { reportIssue?.(`HTTP ${res.status} for ${url}`); return null }
    return res.text()
  } catch (error) { reportIssue?.(`${url}: ${error instanceof Error ? error.message : String(error)}`); return null }
}

async function geminiExtract(
  html: string, pageUrl: string, siteName: string,
  jobType: string, listingType: "job" | "internship", geminiKey: string, reportIssue?: ScraperIssueReporter
): Promise<RawOpportunity[]> {
  // For large pages, find the main listing section first
  let relevantHtml = html
  const listingStart = html.search(/#internship_list|\.individual_internship|internship-listing|\.job-listing|data-internship-id/i)
  if (listingStart > 0) {
    relevantHtml = html.slice(listingStart, listingStart + 80000)
  }

  const text = relevantHtml
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
      "title": "exact job/internship title",
      "company": "company name",
      "type": "${listingType}",
      "stipend": "salary/stipend e.g. ₹15,000/month or null",
      "location": "city or Remote",
      "skills": ["React", "Python"],
      "experience": "0-2 years or Fresher",
      "deadline": "YYYY-MM-DD or null",
      "description": "2-sentence description of the role",
      "applyLink": "URL or null"
    }
  ]
}
Only include real listings with both title AND company. Max 12 items.

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
     
    return (parsed.items || []).filter((i: any) => i.title && i.company).map((item: any, idx: number): RawOpportunity => ({
      title: item.title,
      description: item.description || `${item.title} at ${item.company}. Location: ${item.location || "India"}.`,
      type: listingType,
      issuingAuthority: item.company,
      deadline: parseSourceDate(item.deadline),
      applicationLink: item.applyLink || pageUrl,
      sourceUrl: `${pageUrl}#${listingType}-${idx}-${Buffer.from((item.company || "co").slice(0, 15)).toString("base64").slice(0, 10)}`,
      sourceName: siteName, sourceType: "private",
      location: item.location || "India",
      salaryOrAmount: item.stipend || undefined,
      tags: [siteName, listingType === "internship" ? "Internship" : "Job", ...(item.skills || []).slice(0, 4)],
      eligibilityText: `Experience: ${item.experience || "Fresher"}`,
    }))
  } catch (error) { reportIssue?.(`Gemini extraction failed for ${pageUrl}: ${error instanceof Error ? error.message : String(error)}`); return [] }
}

// ── Internshala: internships ──────────────────────────────────────
const INTERNSHALA_PAGES = [
  { url: "https://internshala.com/internships/computer-science-internship/", label: "CS Internships" },
  { url: "https://internshala.com/internships/web-development-internship/",  label: "Web Dev Internships" },
  { url: "https://internshala.com/internships/data-science-internship/",     label: "Data Science Internships" },
  { url: "https://internshala.com/internships/marketing-internship/",        label: "Marketing Internships" },
  { url: "https://internshala.com/jobs/fresher-jobs/",                       label: "Fresher Jobs" },
]

// ── Private job boards ────────────────────────────────────────────
const PRIVATE_JOB_PAGES = [
  {
    url: "https://www.foundit.in/srp/results?query=software+engineer&location=India&experience=0",
    name: "Foundit", label: "Software Engineer jobs", type: "job" as const,
  },
  {
    url: "https://www.foundit.in/srp/results?query=data+analyst&location=India&experience=0",
    name: "Foundit", label: "Data Analyst jobs", type: "job" as const,
  },
  {
    url: "https://cutshort.io/jobs",
    name: "Cutshort", label: "tech startup jobs", type: "job" as const,
  },
  {
    url: "https://www.hirist.tech/j/software-engineer-jobs",
    name: "Hirist", label: "software engineering jobs", type: "job" as const,
  },
  {
    url: "https://www.hirist.tech/j/data-scientist-jobs",
    name: "Hirist", label: "data science jobs", type: "job" as const,
  },
  {
    url: "https://wellfound.com/jobs?role=engineer&location=India",
    name: "Wellfound", label: "startup engineering jobs", type: "job" as const,
  },
]

export async function fetchInternshala(geminiKey?: string, reportIssue?: ScraperIssueReporter): Promise<RawOpportunity[]> {
  if (!geminiKey) { reportIssue?.("GEMINI_API_KEY is not configured"); return [] }
  const results: RawOpportunity[] = []

  for (const { url, label } of INTERNSHALA_PAGES) {
    const html = await fetchHTML(url, reportIssue)
    if (!html) { console.warn(`[internshala] ${label}: fetch failed`); continue }
    const isJob = url.includes("/jobs/")
    const items = await geminiExtract(html, url, "Internshala", label, isJob ? "job" : "internship", geminiKey, reportIssue)
    results.push(...items)
    console.log(`[internshala] ${label}: ${items.length} listings`)
    await new Promise(r => setTimeout(r, 1200))
  }

  console.log(`[internshala] Total: ${results.length}`)
  return results
}

export async function fetchPrivateJobs(geminiKey?: string, reportIssue?: ScraperIssueReporter): Promise<RawOpportunity[]> {
  if (!geminiKey) { reportIssue?.("GEMINI_API_KEY is not configured"); return [] }
  const results: RawOpportunity[] = []

  for (const { url, name, label, type } of PRIVATE_JOB_PAGES) {
    const html = await fetchHTML(url, reportIssue)
    if (!html) { console.warn(`[${name}] ${label}: fetch failed`); continue }
    const items = await geminiExtract(html, url, name, label, type, geminiKey, reportIssue)
    results.push(...items)
    console.log(`[${name}] ${label}: ${items.length} listings`)
    await new Promise(r => setTimeout(r, 1200))
  }

  console.log(`[private-jobs] Total: ${results.length}`)
  return results
}
