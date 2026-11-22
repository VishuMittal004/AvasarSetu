/**
 * Scholarships — NSP (scholarships.gov.in) + Buddy4Study
 */

import type { RawOpportunity, ScraperIssueReporter } from "../types"
import { parseSourceDate } from "../date"

// NSP API (National Scholarship Portal) — has open endpoints
async function fetchNSP(reportIssue?: ScraperIssueReporter): Promise<RawOpportunity[]> {
  const results: RawOpportunity[] = []

  try {
    // NSP public search endpoint
    const res = await fetch(
      "https://scholarships.gov.in/public/schemeGovt/getSchemeListForMobilApp",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          "User-Agent": "CareerCompass/1.0",
        },
        body: JSON.stringify({ searchScheme: "", stateId: "0", schType: "0" }),
        signal: AbortSignal.timeout(15000),
      }
    )

    if (res.ok) {
      const json = await res.json()
       
      const schemes: any[] = json?.responseData || json?.data || []

      for (const s of schemes.slice(0, 30)) {
        const stableSchemeId = s.schemeId || s.id || s.slug || s.schemeName || s.name
        if (!stableSchemeId) continue
        const schemeId = encodeURIComponent(String(stableSchemeId).trim().slice(0, 180))
        results.push({
          title: s.schemeName || s.name || "Scholarship",
          description: s.schemeDetails || s.description || `Scholarship by ${s.minName || s.ministry || "Government of India"}`,
          type: "scholarship",
          issuingAuthority: s.minName || s.ministry || "Ministry of Education",
          deadline: parseSourceDate(s.closingDate),
          applicationLink: s.applyLink || `https://scholarships.gov.in`,
          sourceUrl: `https://scholarships.gov.in/public/schemeGovt/${schemeId}`,
          sourceName: "NSP (scholarships.gov.in)",
          sourceType: "government",
          location: s.stateId === "0" ? "Pan-India" : undefined,
          salaryOrAmount: s.schemeAmount ? `₹${s.schemeAmount}` : undefined,
          tags: ["Scholarship", "Government", "Education", s.minName || ""].filter(Boolean),
          eligibilityText: s.eligibility || s.criteria || "",
        })
      }
    } else reportIssue?.(`NSP HTTP ${res.status}`)
  } catch (err) {
    console.warn("[nsp] fetch error:", err)
    reportIssue?.(`NSP: ${err instanceof Error ? err.message : String(err)}`)
  }

  console.log(`[nsp] fetched ${results.length} scholarships`)
  return results
}

// Buddy4Study scholarship listings
async function fetchBuddy4Study(reportIssue?: ScraperIssueReporter): Promise<RawOpportunity[]> {
  const results: RawOpportunity[] = []

  try {
    const res = await fetch(
      "https://www.buddy4study.com/api/v1/scholarship/list?page=1&limit=20&status=active",
      {
        headers: {
          "Accept": "application/json",
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
        },
        signal: AbortSignal.timeout(15000),
      }
    )

    if (res.ok) {
      const json = await res.json()
       
      const scholarships: any[] = json?.data || json?.scholarships || []

      for (const s of scholarships.slice(0, 15)) {
        results.push({
          title: s.title || s.name || "Scholarship",
          description: s.description || s.overview || `Scholarship for ${s.eligibility || "students"}`,
          type: "scholarship",
          issuingAuthority: s.provider || s.organization || "Buddy4Study",
          deadline: parseSourceDate(s.lastDate || s.deadline),
          applicationLink: s.applyLink || `https://www.buddy4study.com/scholarship/${s.slug || s.id}`,
          sourceUrl: `https://www.buddy4study.com/scholarship/${s.slug || s.id}`,
          sourceName: "Buddy4Study",
          sourceType: "ngo",
          salaryOrAmount: s.amount ? `₹${s.amount}` : s.award,
          tags: ["Scholarship", ...(s.tags || [])].slice(0, 8),
          eligibilityText: s.eligibility || "",
        })
      }
    } else reportIssue?.(`Buddy4Study HTTP ${res.status}`)
  } catch (err) {
    console.warn("[buddy4study] fetch error:", err)
    reportIssue?.(`Buddy4Study: ${err instanceof Error ? err.message : String(err)}`)
  }

  console.log(`[buddy4study] fetched ${results.length} scholarships`)
  return results
}

export async function fetchScholarships(reportIssue?: ScraperIssueReporter): Promise<RawOpportunity[]> {
  const [nsp, b4s] = await Promise.allSettled([fetchNSP(reportIssue), fetchBuddy4Study(reportIssue)])
  if (nsp.status === "rejected") reportIssue?.(`NSP: ${String(nsp.reason)}`)
  if (b4s.status === "rejected") reportIssue?.(`Buddy4Study: ${String(b4s.reason)}`)
  return [
    ...(nsp.status === "fulfilled" ? nsp.value : []),
    ...(b4s.status === "fulfilled" ? b4s.value : []),
  ]
}

