/**
 * Manual trigger script for local development.
 * Run: npx tsx scripts/live-scraper/run.ts
 */

import * as dotenv from "dotenv"
import { resolve } from "path"

// Load .env.local
dotenv.config({ path: resolve(process.cwd(), ".env.local") })

import { runScraper } from "./orchestrator"

const GEMINI_KEY = process.env.GEMINI_API_KEY
if (!GEMINI_KEY) {
  console.error("❌ GEMINI_API_KEY not set in .env.local")
  process.exit(1)
}

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error("❌ Supabase env vars not set in .env.local")
  process.exit(1)
}

console.log("🚀 Starting CareerCompass Live Scraper (manual run)")
console.log(`📡 Supabase host: ${new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!).hostname}`)

runScraper(GEMINI_KEY).then(result => {
  console.log("\n📊 Final Summary:")
  console.log(JSON.stringify(result, null, 2))
  process.exit(0)
}).catch(err => {
  console.error("💥 Fatal error:", err)
  process.exit(1)
})

