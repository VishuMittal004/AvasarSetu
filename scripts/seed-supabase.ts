/**
 * CareerCompass — Supabase Seed Script
 *
 * Migrates all demoOpportunities.ts records into Supabase.
 *
 * Usage:
 *   1. Add SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to .env.local
 *   2. npx tsx scripts/seed-supabase.ts
 *      (or: node --loader ts-node/esm scripts/seed-supabase.ts)
 */

import { createClient } from "@supabase/supabase-js";
import { DEMO_OPPORTUNITIES } from "../data/demoOpportunities";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("❌  Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in env");
  process.exit(1);
}

 
const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
  realtime: {
     
    transport: class { close() {} send() {} } as any,
  },
});

async function seed() {
  console.log(`\n🌱  Seeding ${DEMO_OPPORTUNITIES.length} opportunities into Supabase...\n`);

  let inserted = 0;
  let errors   = 0;

  for (const opp of DEMO_OPPORTUNITIES) {
    /* 1. Upsert core opportunity row */
    const { error: oppErr } = await supabase.from("opportunities").upsert({
      id:                   opp.id,
      type:                 opp.type,
      title:                opp.title,
      issuing_authority:    opp.issuingAuthority,
      description:          opp.description,
      location:             opp.location,
      state:                opp.state ?? null,
      deadline:             opp.deadline,
      salary_or_amount:     opp.salaryOrAmount ?? null,
      vacancy_count:        opp.vacancyCount   ?? null,
      application_link:     opp.applicationLink,
      tags:                 opp.tags,
      source_name:          opp.source.name,
      source_url:           opp.source.url,
      source_type:          opp.source.type,
      trust_level:          opp.source.trustLevel,
      last_verified_at:     opp.lastVerifiedAt,
      extraction_confidence:1.0,
      is_active:            true,
      is_demo:              true,
    }, { onConflict: "id" });

    if (oppErr) {
      console.error(`  ❌  Opportunity ${opp.id}: ${oppErr.message}`);
      errors++;
      continue;
    }

    /* 2. Upsert eligibility rules */
    const r = opp.rules;
    await supabase.from("eligibility_rules").upsert({
      opportunity_id:      opp.id,
      min_age:             r.minAge             ?? null,
      max_age:             r.maxAge             ?? null,
      max_income:          r.maxIncome          ?? null,
      min_experience:      r.minExperience      ?? null,
      max_experience:      r.maxExperience      ?? null,
      required_education:  r.requiredEducation  ?? [],
      required_degrees:    r.requiredDegrees    ?? [],
      required_branches:   r.requiredBranches   ?? [],
      allowed_categories:  r.allowedCategories  ?? [],
      states:              r.states             ?? [],
      required_skills:     r.requiredSkills     ?? [],
    }, { onConflict: "opportunity_id" });

    /* 3. Upsert required documents */
    if (opp.requiredDocuments.length > 0) {
      // Delete old ones first to avoid dupes on re-seed
      await supabase.from("required_documents").delete().eq("opportunity_id", opp.id);
      await supabase.from("required_documents").insert(
        opp.requiredDocuments.map(d => ({
          opportunity_id: opp.id,
          name:           d.name,
          category:       d.category,
          is_required:    d.required,
          notes:          d.notes ?? null,
        }))
      );
    }

    /* 4. Upsert application steps */
    if (opp.applicationSteps.length > 0) {
      await supabase.from("application_steps").delete().eq("opportunity_id", opp.id);
      await supabase.from("application_steps").insert(
        opp.applicationSteps.map((step, i) => ({
          opportunity_id: opp.id,
          step_order:     i + 1,
          description:    step,
        }))
      );
    }

    inserted++;
    console.log(`  ✅  ${opp.id.padEnd(30)} ${opp.title}`);
  }

  console.log(`\n${"─".repeat(60)}`);
  console.log(`✅  Seeded:  ${inserted}  opportunities`);
  if (errors > 0) console.log(`❌  Errors:  ${errors}`);
  console.log("Done! 🚀\n");
}

seed().catch(err => {
  console.error("Fatal error:", err);
  process.exit(1);
});

