/**
 * CareerCompass — Vector Embedding Generator (Node/TypeScript)
 * Generates 768-dim embeddings for all opportunities using Gemini text-embedding-004
 * and stores them in Supabase opportunity_embeddings (pgvector).
 *
 * Usage:
 *   npx tsx --env-file=.env.local scripts/generate-embeddings.ts
 */

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const GEMINI_KEY   = process.env.GEMINI_API_KEY!;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("❌ Missing Supabase URL or Service Key in .env.local");
  process.exit(1);
}

if (!GEMINI_KEY) {
  console.error("❌ Missing GEMINI_API_KEY in .env.local");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
  realtime: {
     
    transport: class { close() {} send() {} } as any,
  },
});

function buildEmbeddingText(opp: any): string {
  const parts = [
    opp.title || "",
    opp.type || "",
    opp.issuing_authority || "",
    opp.description || "",
    (opp.tags || []).join(" "),
  ];

  const rules = opp.eligibility_rules;
  if (rules) {
    if (rules.required_education?.length) {
      parts.push(`Education: ${rules.required_education.join(", ")}`);
    }
    if (rules.allowed_categories?.length) {
      parts.push(`Category: ${rules.allowed_categories.join(", ")}`);
    }
  }
  if (opp.state) parts.push(`State: ${opp.state}`);

  return parts.filter(Boolean).join(" | ");
}

async function getGeminiEmbedding(text: string): Promise<number[] | null> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent?key=${GEMINI_KEY}`;
  
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "models/gemini-embedding-001",
        content: { parts: [{ text }] },
        outputDimensionality: 768,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.warn(`  ⚠️ Gemini API error (${res.status}): ${err.slice(0, 150)}`);
      return null;
    }

    const data = await res.json();
    return data?.embedding?.values || null;
  } catch (e: any) {
    console.error("  ❌ Network error calling Gemini:", e.message);
    return null;
  }
}

async function run() {
  console.log("\n🧠  Generating Gemini Vector Embeddings for Supabase (pgvector)...\n");

  const { data: opportunities, error } = await supabase
    .from("opportunities")
    .select("*, eligibility_rules(*)")
    .eq("is_active", true);

  if (error || !opportunities) {
    console.error("❌ Failed to fetch opportunities from Supabase:", error);
    process.exit(1);
  }

  console.log(`Found ${opportunities.length} opportunities. Generating embeddings...\n`);

  let count = 0;
  for (const opp of opportunities) {
    const text = buildEmbeddingText(opp);
    const embedding = await getGeminiEmbedding(text);

    if (embedding) {
      const { error: upsertErr } = await supabase
        .from("opportunity_embeddings")
        .upsert({
          opportunity_id: opp.id,
          embedding: embedding,
          embedded_text: text,
          updated_at: new Date().toISOString(),
        });

      if (!upsertErr) {
        count++;
        console.log(`  ✅ [${count}/${opportunities.length}] Embedded: ${opp.title.slice(0, 50)}`);
      } else {
        console.log(`  ⚠️ DB upsert error for ${opp.id}:`, upsertErr.message);
      }
    } else {
      console.log(`  ⏩ Skipped embedding for ${opp.id}`);
    }
  }

  console.log(`\n🎉 Completed! Successfully stored ${count}/${opportunities.length} vector embeddings in Supabase.\n`);
}

run();
