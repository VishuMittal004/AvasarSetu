import { Opportunity, UserProfile, EligibilityResult, SearchResult, EligibilityRules } from "@/types";
import { DEMO_OPPORTUNITIES } from "@/data/demoOpportunities";
import { checkEligibility } from "./EligibilityEngine";
import { usePreferencesStore } from "@/store/usePreferencesStore";
import { createClient as createBrowserSupabaseClient } from "@/lib/supabase/client";

/* ─── Supabase availability check ───────────────────────────────
   We only use the real DB when both env vars are set AND non-placeholder.
   This lets the app work in demo mode without any env setup.
─────────────────────────────────────────────────────────────── */
function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
  return (
    url.startsWith("https://") &&
    !url.includes("your-project") &&
    !url.includes("placeholder") &&
    key.length > 20 &&
    !key.includes("placeholder")
  );
}

function includePresentationSamples(opportunities: Opportunity[]): Opportunity[] {
  const ids = new Set(opportunities.map(opportunity => opportunity.id));
  const liveTitles = new Set(opportunities.map(opportunity => normalizeOpportunityTitle(opportunity.title)));
  return [
    ...opportunities,
    ...DEMO_OPPORTUNITIES.filter(opportunity =>
      !ids.has(opportunity.id) && !liveTitles.has(normalizeOpportunityTitle(opportunity.title))
    ),
  ];
}

function normalizeOpportunityTitle(title: string) {
  return title.toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
}

/* Reuse the app-wide browser client so auth state is not split across clients. */
async function getSupabase() {
  return createBrowserSupabaseClient();
}

/* ─── Row → Opportunity mapper ──────────────────────────────── */
 
export function rowToOpportunity(row: any): Opportunity {
  const ruleRow = Array.isArray(row.eligibility_rules)
    ? row.eligibility_rules[0]
    : row.eligibility_rules;
  const rules: EligibilityRules = {
    minAge:             ruleRow?.min_age             ?? undefined,
    maxAge:             ruleRow?.max_age             ?? undefined,
    maxIncome:          ruleRow?.max_income          ?? undefined,
    minExperience:      ruleRow?.min_experience      ?? undefined,
    maxExperience:      ruleRow?.max_experience      ?? undefined,
    requiredEducation:  ruleRow?.required_education  ?? [],
    requiredDegrees:    ruleRow?.required_degrees    ?? [],
    requiredBranches:   ruleRow?.required_branches   ?? [],
    allowedCategories:  ruleRow?.allowed_categories  ?? [],
    states:             ruleRow?.states              ?? [],
    requiredSkills:     ruleRow?.required_skills     ?? [],
  };
  const demoSection: Opportunity["demoSection"] = row.demo_section ?? (
    row.is_demo
      ? row.type === "exam" ? "exam"
        : row.type === "scholarship" ? "scholarship"
        : row.type === "scheme" ? "scheme"
        : row.type === "policy" ? "policy"
        : row.type === "job" ? (row.source_type === "private" ? "private-job" : "government-job")
        : undefined
      : undefined
  );

  return {
    id:               row.id,
    type:             row.type,
    title:            row.title,
    issuingAuthority: row.issuing_authority,
    description:      row.description ?? "",
    location:         row.location ?? "",
    state:            row.state ?? undefined,
    deadline:         row.deadline,
    salaryOrAmount:   row.salary_or_amount ?? undefined,
    vacancyCount:     row.vacancy_count ?? undefined,
    applicationLink:  row.application_link ?? "#",
    tags:             row.tags ?? [],
    rules,
    requiredDocuments: (Array.isArray(row.required_documents) ? row.required_documents : []).map(
       
      (d: any, i: number) => ({
        id:       `doc-${i}`,
        name:     d.name,
        category: d.category ?? "General",
        required: d.is_required ?? true,
        notes:    d.notes ?? undefined,
      })
    ),
    applicationSteps: (Array.isArray(row.application_steps) ? row.application_steps : [])
      .sort((a: { step_order: number }, b: { step_order: number }) => a.step_order - b.step_order)
      .map((s: { description: string }) => s.description),
    source: {
      name:       row.source_name ?? "Official Source",
      url:        row.source_url  ?? "#",
      type:       row.source_type ?? "government",
      trustLevel: row.trust_level ?? "unverified",
    },
    // Never substitute the current time: that would make old records look freshly scraped.
    lastVerifiedAt: row.last_verified_at ?? "",
    isDemoRecord:   row.is_demo ?? false,
    demoSection,
  };
}

/* ─── OpportunityService ────────────────────────────────────── */
export class OpportunityService {

  /* ── List all active opportunities ─────────────────────────── */
  static async getOpportunities(): Promise<Opportunity[]> {
    const lowDataMode = typeof window !== "undefined" && usePreferencesStore.getState().lowDataMode;
    if (typeof window !== "undefined") {
      try {
        const limit = lowDataMode ? 40 : 200;
        const response = await fetch(`/api/opportunities?limit=${limit}`);
        if (response.ok) {
          const payload = await response.json();
          if (Array.isArray(payload.opportunities)) {
            const opportunities = includePresentationSamples(payload.opportunities as Opportunity[]);
            return lowDataMode
              ? opportunities.map(opportunity => ({ ...opportunity, description: opportunity.description.slice(0, 700) }))
              : opportunities;
          }
        }
      } catch { /* fall back to direct Supabase or local demo data */ }
    }

    // Try Supabase first
    if (isSupabaseConfigured()) {
      try {
        const sb = await getSupabase();
        const { data, error } = await sb
          .from("opportunities")
          .select(`
            *,
            eligibility_rules(*),
            required_documents(*),
            application_steps(*)
          `)
          .eq("is_active", true)
          .eq("is_demo", false)
          .not("id", "like", "demo-%")
          .order("deadline", { ascending: true, nullsFirst: false })
          .range(0, lowDataMode ? 39 : 199);

        if (!error && data && data.length > 0) {
          return includePresentationSamples(data.map(rowToOpportunity));
        }
      } catch (err) {
        console.warn("[OpportunityService] Supabase fetch failed, falling back to demo:", err);
      }
    }

    // Try internal API route (works from browser)
    if (typeof window !== "undefined") {
      try {
        const res = await fetch("/api/opportunities", {
          headers: { "Content-Type": "application/json" },
        });
        if (res.ok) {
          const data = await res.json();
          return includePresentationSamples(data.opportunities as Opportunity[]);
        }
      } catch { /* fall through */ }
    }

    return DEMO_OPPORTUNITIES;
  }

  /* ── Get single opportunity by ID ──────────────────────────── */
  static async getOpportunityById(id: string): Promise<Opportunity | undefined> {
    if (typeof window !== "undefined") {
      try {
        const response = await fetch(`/api/opportunities/${encodeURIComponent(id)}`);
        if (response.ok) {
          const payload = await response.json();
          if (payload.opportunity) return payload.opportunity as Opportunity;
        }
      } catch { /* fall through to direct Supabase or demo data */ }
    }

    if (isSupabaseConfigured()) {
      try {
        const sb = await getSupabase();
        const { data, error } = await sb
          .from("opportunities")
          .select(`
            *,
            eligibility_rules(*),
            required_documents(*),
            application_steps(*)
          `)
          .eq("id", id)
          .single();

        if (!error && data) return rowToOpportunity(data);
      } catch { /* fall through */ }
    }

    if (typeof window !== "undefined") {
      try {
        const res = await fetch(`/api/opportunities/${id}`);
        if (res.ok) {
          const data = await res.json();
          return data.opportunity as Opportunity;
        }
      } catch { /* fall through */ }
    }

    return DEMO_OPPORTUNITIES.find(o => o.id === id);
  }

  /* ── AI-powered query (Groq + SearchService) ────────────────── */
  static async queryWithAI(
    text: string,
    profile?: Partial<UserProfile> | null
  ): Promise<{ opportunities: SearchResult[]; explanation?: string; total: number }> {
    if (typeof window !== "undefined") {
      try {
        const res = await fetch("/api/query", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text, profile }),
        });
        if (res.ok) return res.json();
      } catch { /* fall through */ }
    }
    return { opportunities: [], total: 0 };
  }

  /* ── Explain an opportunity in plain language ────────────────── */
  static async explainOpportunity(id: string): Promise<string> {
    if (typeof window !== "undefined") {
      try {
        const res = await fetch("/api/explain", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ opportunityId: id }),
        });
        if (res.ok) {
          const data = await res.json();
          return data.explanation as string;
        }
      } catch { /* fall through */ }
    }
    const opp = DEMO_OPPORTUNITIES.find(o => o.id === id);
    if (!opp) return "Opportunity not found.";
    const deadlineText = opp.deadline ? `Apply by ${new Date(opp.deadline).toLocaleDateString("en-IN")}. ` : "No deadline is listed. Verify the current status with the source. ";
    return `${opp.title} by ${opp.issuingAuthority}. ${deadlineText}Visit: ${opp.source.url}`;
  }

  /* ── Eligibility check helper ────────────────────────────────── */
  checkOpportunityEligibility(opp: Opportunity, profile: UserProfile): EligibilityResult {
    return checkEligibility(opp.rules, profile);
  }
}

export const opportunityService = new OpportunityService();
