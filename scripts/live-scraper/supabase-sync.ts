/** Validates and idempotently syncs scraped opportunities and their embeddings. */

import { createHash } from "crypto"
import { createClient } from "@supabase/supabase-js"
import type { RawOpportunity } from "./types"
import { parseEligibility } from "./gemini-extractor"
import { parseSourceDate } from "./date"

const SOURCE_HOSTS = [
  "sarkariresult.com", "freejobalert.com", "myscheme.gov.in", "internshala.com",
  "foundit.in", "foundit.com", "cutshort.io", "hirist.com", "wellfound.com",
  "buddy4study.com", "scholarships.gov.in", "indgovtjobs.in", "ibps.in",
  "upsc.gov.in", "eshram.gov.in", "india.gov.in",
]
const BATCH_SIZE = 50

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error("Supabase URL and service role key are required")
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
}

function parseHttpsUrl(value: string | undefined): URL | null {
  if (!value || value.length > 2048) return null
  try {
    const url = new URL(value)
    if (url.protocol !== "https:" || url.username || url.password) return null
    if (url.hostname === "localhost" || url.hostname.endsWith(".local")) return null
    return url
  } catch {
    return null
  }
}

function isAllowedSource(url: URL) {
  const host = url.hostname.toLowerCase()
  return SOURCE_HOSTS.some(domain => host === domain || host.endsWith(`.${domain}`)) ||
    host.endsWith(".gov.in") || host.endsWith(".nic.in") || host.endsWith(".ac.in")
}

function normalizeSourceUrl(value: string) {
  const url = parseHttpsUrl(value)
  if (!url || !isAllowedSource(url)) return null
  url.hash = ""
  return url.toString()
}

function safeApplicationUrl(value: string | undefined, sourceUrl: string) {
  const url = parseHttpsUrl(value)
  if (!url) return sourceUrl
  const sourceHost = new URL(sourceUrl).hostname.toLowerCase()
  if (!isAllowedSource(url) && url.hostname.toLowerCase() !== sourceHost) return sourceUrl
  return url.toString()
}

function stableOpportunityId(sourceUrl: string) {
  const hex = createHash("sha256").update(sourceUrl).digest("hex").slice(0, 32)
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

function isOfficialSource(sourceUrl: string) {
  const host = new URL(sourceUrl).hostname.toLowerCase()
  return host.endsWith(".gov.in") || host.endsWith(".nic.in") || host.endsWith(".ac.in")
}

function chunks<T>(items: T[], size: number) {
  const batches: T[][] = []
  for (let i = 0; i < items.length; i += size) batches.push(items.slice(i, i + size))
  return batches
}

async function requestEmbeddings(texts: string[], geminiKey: string): Promise<number[][]> {
  const requests = texts.map(text => ({
    model: "models/gemini-embedding-001",
    content: { parts: [{ text }] },
    outputDimensionality: 768,
  }))
  let lastError: Error | undefined

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:batchEmbedContents?key=${geminiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ requests }),
          signal: AbortSignal.timeout(30_000),
        },
      )
      if (response.status === 429 || response.status >= 500) {
        lastError = new Error(`Gemini embedding batch returned HTTP ${response.status}`)
        await new Promise(resolve => setTimeout(resolve, 500 * (2 ** attempt)))
        continue
      }
      if (!response.ok) throw new Error(`Gemini embedding batch returned HTTP ${response.status}`)
      const payload = await response.json()
      const embeddings: number[][] = payload?.embeddings?.map((row: { values?: number[] }) => row.values ?? []) ?? []
      if (embeddings.length !== texts.length || embeddings.some(values => values.length !== 768)) {
        throw new Error("Gemini returned an invalid embedding batch")
      }
      return embeddings
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))
      if (attempt < 2) await new Promise(resolve => setTimeout(resolve, 500 * (2 ** attempt)))
    }
  }
  throw lastError ?? new Error("Gemini embedding request failed")
}

export interface SyncResult {
  inserted: number
  updated: number
  skipped: number
  embeddingsGenerated: number
  errors: number
}

export interface CrawlSourceLog {
  name: string
  status: "succeeded" | "empty" | "partial" | "failed"
  recordsFound: number
  errorMessage?: string
  durationMs?: number
}

export async function beginCrawlRun(startedAt: string) {
  try {
    const { data, error } = await getSupabase().from("crawl_runs")
      .insert({ status: "running", started_at: startedAt })
      .select("id")
      .single()
    if (error) throw error
    return data.id as string
  } catch (error) {
    console.warn("[crawl-log] could not create run record:", error)
    return null
  }
}

export async function writeCrawlSourceLogs(runId: string | null, sources: CrawlSourceLog[]) {
  if (!runId || sources.length === 0) return
  try {
    const { error } = await getSupabase().from("crawl_source_runs").upsert(
      sources.map(source => ({
        run_id: runId,
        source_name: source.name,
        status: source.status,
        records_found: source.recordsFound,
        error_message: source.errorMessage?.slice(0, 1000) ?? null,
        duration_ms: source.durationMs ?? null,
      })),
      { onConflict: "run_id,source_name" },
    )
    if (error) throw error
  } catch (error) {
    console.warn("[crawl-log] could not write source logs:", error)
  }
}

export async function finishCrawlRun(
  runId: string | null,
  values: { status: string; finishedAt: string; durationMs: number; totalFetched: number; sync: SyncResult; summary: Record<string, unknown> },
) {
  if (!runId) return
  try {
    const { error } = await getSupabase().from("crawl_runs").update({
      status: values.status,
      finished_at: values.finishedAt,
      duration_ms: values.durationMs,
      total_fetched: values.totalFetched,
      inserted: values.sync.inserted,
      updated: values.sync.updated,
      sync_errors: values.sync.errors,
      summary: values.summary,
    }).eq("id", runId)
    if (error) throw error
  } catch (error) {
    console.warn("[crawl-log] could not finish run record:", error)
  }
}

/** Sends an optional alert when a source is unhealthy on two consecutive runs. */
export async function alertRepeatedCrawlIssues(runId: string | null) {
  const webhook = process.env.CRAWL_ALERT_WEBHOOK_URL
  if (!runId || !webhook) return

  try {
    const url = new URL(webhook)
    if (url.protocol !== "https:" || url.username || url.password || url.hostname === "localhost" || url.hostname.endsWith(".local")) {
      console.warn("[crawl-alert] webhook must be a public HTTPS URL")
      return
    }

    const supabase = getSupabase()
    const { data: runs, error: runsError } = await supabase
      .from("crawl_runs")
      .select("id")
      .order("started_at", { ascending: false })
      .limit(2)
    if (runsError || !runs || runs.length < 2 || !runs.some(run => run.id === runId)) return

    const { data: sourceRuns, error: sourcesError } = await supabase
      .from("crawl_source_runs")
      .select("run_id, source_name, status, records_found")
      .in("run_id", runs.map(run => run.id))
    if (sourcesError || !sourceRuns) return

    const currentRunSources = sourceRuns.filter(source => source.run_id === runId)
    const previousRun = runs.find(run => run.id !== runId)
    if (!previousRun) return
    const previousByName = new Map(
      sourceRuns.filter(source => source.run_id === previousRun.id).map(source => [source.source_name, source]),
    )
    const unhealthy = currentRunSources.filter(source => {
      const previous = previousByName.get(source.source_name)
      const isUnhealthy = (value: { status: string; records_found: number }) =>
        value.status === "failed" || value.status === "partial" || value.status === "empty" || value.records_found === 0
      return isUnhealthy(source) && previous !== undefined && isUnhealthy(previous)
    })
    if (!unhealthy.length) return

    const sourceSummary = unhealthy
      .map(source => `${source.source_name}: ${source.status} (${source.records_found} records)`)
      .join("; ")
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: `CareerCompass ingestion alert: source issues persisted across two consecutive runs. ${sourceSummary}`,
        content: `CareerCompass ingestion alert: source issues persisted across two consecutive runs. ${sourceSummary}`,
      }),
      signal: AbortSignal.timeout(5_000),
    })
    if (!response.ok) console.warn(`[crawl-alert] webhook returned HTTP ${response.status}`)
  } catch (error) {
    console.warn("[crawl-alert] could not deliver alert:", error)
  }
}

interface PreparedOpportunity {
  raw: RawOpportunity
  sourceUrl: string
  id: string
  row: Record<string, unknown>
  eligibility: Awaited<ReturnType<typeof parseEligibility>>
  embeddedText: string
}

export async function syncToSupabase(
  raw: RawOpportunity[],
  geminiKey: string,
  options: { batchEmbeddings?: boolean } = {},
): Promise<SyncResult> {
  const sb = getSupabase()
  const result: SyncResult = { inserted: 0, updated: 0, skipped: 0, embeddingsGenerated: 0, errors: 0 }
  if (raw.length === 0) return result

  const uniqueByUrl = new Map<string, RawOpportunity>()
  for (const item of raw) {
    const sourceUrl = normalizeSourceUrl(item.sourceUrl)
    const title = typeof item.title === "string" ? item.title.trim() : ""
    if (!sourceUrl || !title || title.length > 200 || !item.issuingAuthority?.trim() || !item.sourceName?.trim()) {
      result.skipped++
      continue
    }
    uniqueByUrl.set(sourceUrl, { ...item, title, sourceUrl })
  }
  const items = [...uniqueByUrl.values()]
  if (items.length === 0) return result

  const sourceDefinitions = [...new Map(items.map(item => {
    const url = new URL(item.sourceUrl)
    const sourceUrl = url.origin
    return [sourceUrl, {
      name: item.sourceName.slice(0, 120),
      url: sourceUrl,
      type: item.sourceType === "private" ? "private" : item.sourceType === "ngo" ? "ngo" : "government",
      trust_level: isOfficialSource(item.sourceUrl) ? "verified" : "unverified",
      is_active: true,
      last_scraped_at: new Date().toISOString(),
    }]
  })).values()]
  const sourceIds = new Map<string, number>()
  for (const batch of chunks(sourceDefinitions, BATCH_SIZE)) {
    const { data, error } = await sb.from("sources").upsert(batch, { onConflict: "url" }).select("id,url")
    if (error) {
      console.warn("[sync] source registry update failed:", error.message)
      result.errors += batch.length
      continue
    }
    for (const source of data ?? []) sourceIds.set(source.url, source.id)
  }

  const existingByUrl = new Map<string, { id: string; embeddedText: string | null }>()
  for (const batch of chunks(items.map(item => item.sourceUrl), BATCH_SIZE)) {
    const { data, error } = await sb.from("opportunities")
      .select("id,source_url,opportunity_embeddings(embedded_text)")
      .in("source_url", batch)
    if (error) throw new Error(`Could not check existing source records: ${error.message}`)
    for (const row of data ?? []) {
      const embeddingRow = Array.isArray(row.opportunity_embeddings)
        ? row.opportunity_embeddings[0]
        : row.opportunity_embeddings
      existingByUrl.set(row.source_url, { id: row.id, embeddedText: embeddingRow?.embedded_text ?? null })
    }
  }

  const prepared: PreparedOpportunity[] = []
  for (const item of items) {
    try {
      const sourceUrl = item.sourceUrl
      const existing = existingByUrl.get(sourceUrl)
      const sourceId = sourceIds.get(new URL(sourceUrl).origin) ?? null
      const eligibility = item.eligibilityText
        ? await parseEligibility(item.eligibilityText.slice(0, 1200), geminiKey)
        : {}
      const embeddedText = [item.title, item.issuingAuthority, item.description, (item.tags ?? []).join(", ")]
        .filter(Boolean).join("\n").slice(0, 7000)
      const row = {
        id: existing?.id ?? stableOpportunityId(sourceUrl),
        source_url: sourceUrl,
        source_id: sourceId,
        title: item.title,
        type: item.type,
        issuing_authority: item.issuingAuthority.trim().slice(0, 200),
        description: (item.description ?? "").slice(0, 10_000),
        location: (item.location || "Pan-India").slice(0, 160),
        state: item.state?.slice(0, 100) ?? null,
        deadline: parseSourceDate(item.deadline),
        salary_or_amount: item.salaryOrAmount?.slice(0, 200) ?? null,
        vacancy_count: Number.isInteger(item.vacancyCount) && (item.vacancyCount ?? 0) >= 0 ? item.vacancyCount : null,
        application_link: safeApplicationUrl(item.applicationLink, sourceUrl),
        tags: (item.tags ?? []).filter(tag => typeof tag === "string").slice(0, 30),
        source_name: item.sourceName.slice(0, 120),
        source_type: item.sourceType || "government",
        trust_level: isOfficialSource(sourceUrl) ? "verified" : "unverified",
        is_active: true,
        is_demo: false,
        last_verified_at: new Date().toISOString(),
        extraction_confidence: item.eligibilityText ? 0.7 : 0.85,
      }
      prepared.push({ raw: item, sourceUrl, id: row.id as string, row, eligibility, embeddedText })
    } catch (error) {
      console.warn(`[sync] could not prepare "${item.title}":`, error)
      result.errors++
    }
  }

  const synced: PreparedOpportunity[] = []
  for (const batch of chunks(prepared, BATCH_SIZE)) {
    const { error } = await sb.from("opportunities").upsert(batch.map(item => item.row), { onConflict: "id" })
    if (error) {
      console.error("[sync] opportunity batch failed:", error.message)
      result.errors += batch.length
      continue
    }
    synced.push(...batch)
    for (const item of batch) {
      if (existingByUrl.has(item.sourceUrl)) result.updated++
      else result.inserted++
    }
  }

  const ruleRows = synced.map(item => ({
    opportunity_id: item.id,
    min_age: item.eligibility.minAge ?? null,
    max_age: item.eligibility.maxAge ?? null,
    max_income: item.eligibility.maxIncome ?? null,
    required_education: item.eligibility.requiredEducation ?? [],
    required_degrees: item.eligibility.requiredDegrees ?? [],
    required_branches: item.eligibility.requiredBranches ?? [],
    allowed_categories: item.eligibility.allowedCategories ?? [],
    states: item.eligibility.states ?? [],
    required_skills: item.eligibility.requiredSkills ?? [],
    min_experience: item.eligibility.minExperience ?? null,
    max_experience: item.eligibility.maxExperience ?? null,
  }))
  for (const batch of chunks(ruleRows, BATCH_SIZE)) {
    const { error } = await sb.from("eligibility_rules").upsert(batch, { onConflict: "opportunity_id" })
    if (error) {
      console.error("[sync] eligibility batch failed:", error.message)
      result.errors += batch.length
    }
  }

  if (options.batchEmbeddings !== false) {
    const needsEmbedding = synced.filter(item => existingByUrl.get(item.sourceUrl)?.embeddedText !== item.embeddedText)
    for (const batch of chunks(needsEmbedding, BATCH_SIZE)) {
      try {
        const embeddings = await requestEmbeddings(batch.map(item => item.embeddedText), geminiKey)
        const rows = batch.map((item, index) => ({
          opportunity_id: item.id,
          embedding: embeddings[index],
          embedded_text: item.embeddedText,
          updated_at: new Date().toISOString(),
        }))
        const { error } = await sb.from("opportunity_embeddings").upsert(rows, { onConflict: "opportunity_id" })
        if (error) {
          console.error("[sync] embedding batch failed:", error.message)
          result.errors += batch.length
        } else {
          result.embeddingsGenerated += batch.length
        }
      } catch (error) {
        console.error("[sync] embedding batch failed:", error)
        result.errors += batch.length
      }
    }
  }

  return result
}

/** Only retire stale records from sources that produced records in this successful run. */
export async function deactivateStaleOpportunities(daysThreshold = 7, sourceNames: string[] = []): Promise<number> {
  if (sourceNames.length === 0) return 0
  const sb = getSupabase()
  const cutoff = new Date(Date.now() - daysThreshold * 86400000).toISOString()
  const { data, error } = await sb.from("opportunities")
    .update({ is_active: false }, { count: "exact" })
    .lt("last_verified_at", cutoff)
    .eq("is_demo", false)
    .in("source_name", sourceNames)
    .select("id")
  if (error) {
    console.warn("[sync] deactivate error:", error.message)
    return 0
  }
  return data?.length ?? 0
}
