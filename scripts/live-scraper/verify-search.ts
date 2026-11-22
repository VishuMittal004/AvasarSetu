import * as dotenv from "dotenv"
import { resolve } from "path"
import { createClient } from "@supabase/supabase-js"

dotenv.config({ path: resolve(process.cwd(), ".env.local") })

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
const geminiKey = process.env.GEMINI_API_KEY

if (!url || !key || !geminiKey) {
  throw new Error("Set Supabase URL, service role key, and Gemini key in .env.local")
}

const supabase = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
})

async function main() {
for (const query of ["fullstack", "banking", "railway"]) {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent?key=${geminiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "models/gemini-embedding-001",
        content: { parts: [{ text: query }] },
        outputDimensionality: 768,
      }),
      signal: AbortSignal.timeout(15_000),
    },
  )
  if (!response.ok) throw new Error(`Gemini embedding request failed (${response.status})`)
  const payload = await response.json()
  const embedding: number[] = payload?.embedding?.values ?? []
  if (embedding.length !== 768) throw new Error(`Unexpected embedding dimensions for "${query}"`)

  const { data, error } = await supabase.rpc("match_opportunities", {
    query_embedding: embedding,
    match_threshold: 0.501,
    match_count: 5,
  })
  if (error) throw new Error(`Vector search failed for "${query}": ${error.message}`)

  const ids = (data ?? []).map((row: { opportunity_id: string }) => row.opportunity_id)
  const { data: rows, error: rowError } = ids.length
    ? await supabase.from("opportunities").select("id,title").in("id", ids)
    : { data: [], error: null }
  if (rowError) throw rowError
  const byId = new Map((rows ?? []).map(row => [row.id, row.title]))

  console.log(JSON.stringify({
    query,
    vectorMatches: ids.length,
    results: ids.map((id: string, index: number) => ({
      title: byId.get(id) ?? "(missing opportunity)",
      similarity: Number(data[index].similarity.toFixed(4)),
    })),
  }))
}
}

main().catch(error => {
  console.error("Vector search verification failed:", error)
  process.exitCode = 1
})
