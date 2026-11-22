/**
 * /api/cron/scrape — called by Vercel Cron every 6 hours
 *
 * Also callable manually:
 *   curl -X POST http://localhost:3000/api/cron/scrape \
 *        -H "Authorization: Bearer <CRON_SECRET>"
 *
 * Vercel Cron sets the Authorization header automatically.
 */

import { NextResponse } from "next/server"
import { isCronAuthorized } from "@/lib/cron-auth"

export const maxDuration = 300  // 5 min timeout (Vercel Pro: 300s)
export const runtime = "nodejs" // needs Node.js for crypto + file system

export async function GET(request: Request) {
  return handler(request)
}

export async function POST(request: Request) {
  return handler(request)
}

async function handler(request: Request) {
  if (!isCronAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const geminiKey = process.env.GEMINI_API_KEY
  if (!geminiKey) {
    return NextResponse.json({ error: "GEMINI_API_KEY not configured" }, { status: 500 })
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 500 })
  }

  console.log("[cron/scrape] Starting scraper run...")

  try {
    // Dynamic import to keep the route fast when not running
    const { runScraper } = await import("../../../../scripts/live-scraper/orchestrator")
    const result = await runScraper(geminiKey)

    console.log("[cron/scrape] Done:", JSON.stringify(result))

    return NextResponse.json({
      ok: true,
      ...result,
    })
  } catch (err) {
    console.error("[cron/scrape] Fatal error:", err)
    return NextResponse.json(
      { error: "Scraper failed", detail: String(err) },
      { status: 500 }
    )
  }
}
