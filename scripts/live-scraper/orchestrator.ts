/**
 * CareerCompass — Live Scraper Orchestrator
 *
 * Runs all scrapers in parallel, syncs results to Supabase.
 * Called by: /api/cron/scrape  OR  npx tsx scripts/live-scraper/run.ts
 *
 * Schedule: every 6 hours via Vercel Cron (vercel.json)
 */

import { fetchMyScheme }         from "./sources/myscheme"
import { fetchInternshala }      from "./sources/internshala"
import { fetchGovtJobsViaGemini }from "./sources/govt-jobs"
import { fetchScholarships }     from "./sources/scholarships"
import { fetchPrivateJobs }      from "./sources/private-jobs"
import { syncToSupabase, deactivateStaleOpportunities, beginCrawlRun, writeCrawlSourceLogs, finishCrawlRun, alertRepeatedCrawlIssues, type SyncResult, type CrawlSourceLog } from "./supabase-sync"
import type { RawOpportunity } from "./types"

export interface OrchestratorResult {
  startedAt: string
  finishedAt: string
  durationMs: number
  sourceResults: Record<string, number>
  sourceLog: CrawlSourceLog[]
  totalFetched: number
  afterDedup: number
  sync: SyncResult
  deactivated: number
}

export async function runScraper(geminiKey: string): Promise<OrchestratorResult> {
  const startedAt = new Date().toISOString()
  const start = Date.now()
  const crawlRunId = await beginCrawlRun(startedAt)

  console.log("\n🔄 CareerCompass Live Scraper — Starting...\n")
  console.log("Sources: MyScheme | Internshala | Govt Sites | Scholarships | Private Jobs")
  console.log("─".repeat(60))

  // ── Fetch from all sources in parallel ───────────────────────────
  const sourceLog: CrawlSourceLog[] = []
  const runSource = async (name: string, fetcher: (reportIssue: (message: string) => void) => Promise<RawOpportunity[]>) => {
    const sourceStart = Date.now()
    const issues: string[] = []
    const reportIssue = (message: string) => issues.push(message.slice(0, 500))
    try {
      const items = await fetcher(reportIssue)
      const status = issues.length ? items.length ? "partial" : "failed" : items.length ? "succeeded" : "empty"
      sourceLog.push({ name, status, recordsFound: items.length, errorMessage: issues.length ? issues.join("\n").slice(0, 1000) : undefined, durationMs: Date.now() - sourceStart })
      return { status: "fulfilled" as const, value: items }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      reportIssue(message)
      sourceLog.push({ name, status: "failed", recordsFound: 0, errorMessage: message, durationMs: Date.now() - sourceStart })
      return { status: "rejected" as const, reason: error }
    }
  }
  const [myscheme, internshala, govtJobs, scholarships, privateJobs] = await Promise.all([
    runSource("myscheme.gov.in", reportIssue => fetchMyScheme(geminiKey, reportIssue)),
    runSource("internshala", reportIssue => fetchInternshala(geminiKey, reportIssue)),
    runSource("govt-portals", reportIssue => fetchGovtJobsViaGemini(geminiKey, reportIssue)),
    runSource("scholarships", reportIssue => fetchScholarships(reportIssue)),
    runSource("private-jobs", reportIssue => fetchPrivateJobs(geminiKey, reportIssue)),
  ])
  await writeCrawlSourceLogs(crawlRunId, sourceLog)

  const sourceResults: Record<string, number> = {
    "myscheme.gov.in":    myscheme.status    === "fulfilled" ? myscheme.value.length    : 0,
    "internshala":        internshala.status === "fulfilled" ? internshala.value.length  : 0,
    "govt-portals":       govtJobs.status    === "fulfilled" ? govtJobs.value.length    : 0,
    "scholarships":       scholarships.status === "fulfilled" ? scholarships.value.length : 0,
    "private-jobs":       privateJobs.status === "fulfilled" ? privateJobs.value.length : 0,
  }

  // Merge all
  const all: RawOpportunity[] = [
    ...(myscheme.status    === "fulfilled" ? myscheme.value    : []),
    ...(internshala.status === "fulfilled" ? internshala.value : []),
    ...(govtJobs.status    === "fulfilled" ? govtJobs.value    : []),
    ...(scholarships.status === "fulfilled" ? scholarships.value : []),
    ...(privateJobs.status === "fulfilled" ? privateJobs.value : []),
  ]

  const totalFetched = all.length
  console.log(`\n📦 Total fetched: ${totalFetched}`)
  for (const [src, count] of Object.entries(sourceResults)) {
    const icon = count > 0 ? "✅" : "⚠️"
    console.log(`   ${icon} ${src}: ${count}`)
  }

  // ── Deduplicate by sourceUrl ──────────────────────────────────────
  const seen = new Set<string>()
  const deduped = all.filter(item => {
    if (!item.sourceUrl || seen.has(item.sourceUrl)) return false
    seen.add(item.sourceUrl)
    return true
  })
  const afterDedup = deduped.length
  console.log(`\n🔎 After dedup: ${afterDedup} unique opportunities`)

  // ── Sync to Supabase ──────────────────────────────────────────────
  console.log("\n📤 Syncing to Supabase (upsert + embeddings)...\n")
  let sync: SyncResult
  try {
    sync = await syncToSupabase(deduped, geminiKey, { batchEmbeddings: true })
  } catch (error) {
    const finishedAt = new Date().toISOString()
    const durationMs = Date.now() - start
    const failedSync: SyncResult = { inserted: 0, updated: 0, skipped: 0, embeddingsGenerated: 0, errors: Math.max(1, deduped.length) }
    await finishCrawlRun(crawlRunId, {
      status: "failed", finishedAt, durationMs, totalFetched,
      sync: failedSync,
      summary: { sourceResults, sourceLog, afterDedup, fatalError: error instanceof Error ? error.message.slice(0, 1000) : String(error).slice(0, 1000) },
    })
    await alertRepeatedCrawlIssues(crawlRunId)
    throw error
  }

  console.log(`\n✅ Sync complete:`)
  console.log(`   +${sync.inserted} inserted`)
  console.log(`   ~${sync.updated} updated`)
  console.log(`   ${sync.errors} errors`)
  console.log(`   🔮 ${sync.embeddingsGenerated} embeddings generated`)

  // ── Deactivate old stale records ──────────────────────────────────
  const hasSourceErrors = sourceLog.some(source => source.status === "partial" || source.status === "failed")
  const healthySources = [...new Set(deduped.map(item => item.sourceName).filter(Boolean))]
  const canDeactivateStale = !hasSourceErrors && sync.errors === 0 && deduped.length > 0
  const deactivated = canDeactivateStale ? await deactivateStaleOpportunities(7, healthySources) : 0
  console.log(`\n🗑️  Deactivated ${deactivated} stale records`)

  const finishedAt = new Date().toISOString()
  const durationMs = Date.now() - start
  const sourceProblems = sourceLog.filter(source => source.status === "failed" || source.status === "partial").length
  await finishCrawlRun(crawlRunId, {
    status: sourceProblems === sourceLog.length || (totalFetched === 0 && sourceProblems > 0) ? "failed" : sourceProblems > 0 || sync.errors > 0 ? "partial" : "succeeded",
    finishedAt, durationMs, totalFetched, sync,
    summary: { sourceResults, sourceLog, sourceProblems, afterDedup, deactivated },
  })
  await alertRepeatedCrawlIssues(crawlRunId)
  console.log(`\n🏁 Done in ${(durationMs / 1000).toFixed(1)}s\n`)

  return { startedAt, finishedAt, durationMs, sourceResults, sourceLog, totalFetched, afterDedup, sync, deactivated }
}
