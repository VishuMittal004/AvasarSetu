/**
 * Types for the live scraper pipeline.
 * Each source returns RawOpportunity[] which gets normalized into Opportunity schema.
 */

export interface RawOpportunity {
  title: string
  description: string
  type: "job" | "scholarship" | "scheme" | "exam" | "internship" | "subsidy"
  issuingAuthority: string
  deadline: string | null          // ISO string or null if unknown
  applicationLink: string
  sourceUrl: string                // unique key for dedup
  sourceName: string
  location?: string
  state?: string
  salaryOrAmount?: string
  vacancyCount?: number
  tags?: string[]
  // eligibility hints (Gemini will parse these)
  eligibilityText?: string
  // "government" | "private" | "ngo" | "academic"
  sourceType?: string
}

export type ScraperIssueReporter = (message: string) => void

export interface ScraperSource {
  name: string
  fetch(): Promise<RawOpportunity[]>
}

