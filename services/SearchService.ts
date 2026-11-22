import { Opportunity, SearchQuery, SearchResult, UserProfile, RankingReason, EducationLevel } from "@/types";
import { checkEligibility } from "./EligibilityEngine";
import { getDeadlineDaysLeft } from "@/lib/utils";
import { QueryParser } from "./QueryParser";

/* ─────────────────────────────────────────────────────────────────
   Education level hierarchy — higher index = higher level
───────────────────────────────────────────────────────────────── */
const EDU_ORDER: EducationLevel[] = [
  "below-10th", "10th-pass", "12th-pass", "undergraduate",
  "graduate", "postgraduate", "doctorate",
];
const eduIndex = (level: EducationLevel) => EDU_ORDER.indexOf(level);

export class SearchService {

  /* ─── Main search entry point ─────────────────────────────────── */
  public static search(
    query: SearchQuery,
    profile: Partial<UserProfile> | null,
    opportunities: Opportunity[],
    options: { allowSemanticMatches?: boolean; preserveInputOrder?: boolean } = {}
  ): SearchResult[] {
    const results: SearchResult[] = [];
    const effectiveProfile: Partial<UserProfile> = { ...(profile ?? {}), ...(query.profileHints ?? {}) };
    const hasProfile = Object.keys(effectiveProfile).length > 0;
    const q = query.raw.toLowerCase().trim();
    const hasQuery = q.length > 0;
    const hasFilters =
      (query.filters.type?.length ?? 0) > 0 ||
      (query.filters.category?.length ?? 0) > 0 ||
      (query.filters.education?.length ?? 0) > 0 ||
      (query.filters.location?.length ?? 0) > 0 ||
      (query.filters.degree?.length ?? 0) > 0 ||
      query.filters.demoSection !== undefined ||
      Object.keys(query.profileHints ?? {}).length > 0 ||
      query.intent !== undefined;

    for (const opp of opportunities) {
      /* ── HARD FILTERS (must pass, or card is excluded) ─────────── */

      // Section labels apply to synthetic presentation records only. Live
      // catalogue rows remain eligible to appear alongside them.
      if (query.filters.demoSection && opp.isDemoRecord && opp.demoSection !== query.filters.demoSection) continue;

      // 1. Type filter
      if ((query.filters.type?.length ?? 0) > 0) {
        if (!query.filters.type!.includes(opp.type)) continue;
      }
      // Also filter by intent if set (and no explicit type filter)
      if (query.intent && (query.filters.type?.length ?? 0) === 0) {
        if (opp.type !== query.intent) {
          // Soft skip — only exclude if no keyword match either
          const searchable = `${opp.title} ${opp.description} ${opp.tags.join(" ")}`.toLowerCase();
          const hasKwMatch = query.keywords.some(kw => searchable.includes(kw));
          if (!hasKwMatch) continue;
        }
      }

      // 2. Category filter — if rule specifies categories, opp must allow it
      if ((query.filters.category?.length ?? 0) > 0) {
        const reqCats = query.filters.category!;
        if (
          opp.rules.allowedCategories &&
          opp.rules.allowedCategories.length > 0 &&
          !opp.rules.allowedCategories.some(c => reqCats.includes(c))
        ) continue;
      }

      // 3. Location filter
      if ((query.filters.location?.length ?? 0) > 0) {
        const reqLocs = query.filters.location!.map(l => l.toLowerCase());
        const oppLoc = (opp.location || opp.state || "").toLowerCase();
        const isPanIndia = oppLoc.includes("pan") || oppLoc === "";
        if (!isPanIndia && !reqLocs.some(l => oppLoc.includes(l))) continue;
      }

      // 4. Education filter — user's required education must be in opp's accepted list
      if ((query.filters.education?.length ?? 0) > 0) {
        const reqEdu = query.filters.education!;
        if (opp.rules.requiredEducation && opp.rules.requiredEducation.length > 0) {
          // Accept if any required edu is at or above the minimum in the opp
          const minOppEdu = opp.rules.requiredEducation.reduce(
            (min, e) => Math.min(min, eduIndex(e)), 99
          );
          const userMaxEdu = reqEdu.reduce((max, e) => Math.max(max, eduIndex(e)), -1);
          if (userMaxEdu < minOppEdu) continue;
        }
      }

      // 5. Degree filter
      if ((query.filters.degree?.length ?? 0) > 0) {
        const reqDegrees = query.filters.degree!.map(d => d.toLowerCase());
        if (opp.rules.requiredDegrees && opp.rules.requiredDegrees.length > 0) {
          const hasMatch = opp.rules.requiredDegrees.some(d =>
            reqDegrees.some(r => d.toLowerCase().includes(r))
          );
          if (!hasMatch) continue;
        }
      }

      // 6. Text search — if user typed something, the opp must match it somewhere
      const searchable = `${opp.title} ${opp.description} ${opp.issuingAuthority} ${opp.tags.join(" ")}`.toLowerCase();
      if (hasQuery && !hasFilters && !options.allowSemanticMatches) {
        // Pure text search mode: require at least one token match
        const tokens = q.split(/\s+/).filter(t => t.length > 2);
        const anyMatch = tokens.some(t => searchable.includes(t));
        if (!anyMatch) continue;
      }

      /* ── ELIGIBILITY ───────────────────────────────────────────── */
      const eligibility = checkEligibility(opp.rules, effectiveProfile);

      /* ── RELEVANCE SCORING ─────────────────────────────────────── */
      let score = 0;
      const rankingReasons: RankingReason[] = [];

      const addScore = (points: number, reason: string) => {
        score += points;
        rankingReasons.push({ factor: reason, score: points });
      };

      // Keyword matches — most important signal
      const keywords = query.keywords.length > 0
        ? query.keywords
        : q.split(/\s+/).filter(t => t.length > 2);

      let kwMatches = 0;
      for (const kw of keywords) {
        if (searchable.includes(kw.toLowerCase())) kwMatches++;
      }
      if (kwMatches > 0) {
        addScore(Math.min(30, kwMatches * 8), `${kwMatches} keyword match${kwMatches > 1 ? "es" : ""}`);
      }

      // Exact title match — big boost
      const titleLower = opp.title.toLowerCase();
      if (keywords.some(kw => titleLower.includes(kw.toLowerCase()))) {
        addScore(15, "Title match");
      }

      // Type / intent match
      if (query.intent && opp.type === query.intent) addScore(20, "Exact type match");

      // Profile-based eligibility boosts
      if (hasProfile) {
        if (eligibility.isEligible)              addScore(25, "Fully eligible");
        else if (eligibility.isPartiallyEligible) addScore(10, "Partially eligible");
        if (eligibility.matchedCriteria.includes("Age"))      addScore(5, "Age match");
        if (eligibility.matchedCriteria.includes("Category")) addScore(8, "Category match");
        if (eligibility.matchedCriteria.includes("Income"))   addScore(5, "Income match");
        if (eligibility.matchedCriteria.includes("Degree"))   addScore(10, "Degree match");
        if (eligibility.matchedCriteria.includes("Branch"))   addScore(8, "Branch match");
        if (eligibility.matchedCriteria.includes("Skills"))   addScore(10, "Skills match");

        // Location match
        if (effectiveProfile.state) {
          const profState = effectiveProfile.state.toLowerCase();
          const oppState = (opp.state || opp.location || "").toLowerCase();
          if (oppState && !oppState.includes("pan") && oppState.includes(profState)) {
            addScore(8, "Location match");
          }
        }
      }

      // Trust / recency signals
      if (opp.source.trustLevel === "verified") addScore(8, "Verified source");
      const daysLeft = getDeadlineDaysLeft(opp.deadline);
      if (daysLeft !== null && daysLeft > 0 && daysLeft <= 14)  addScore(5, "Deadline < 14 days");
      else if (daysLeft !== null && daysLeft > 0 && daysLeft <= 30) addScore(3, "Deadline < 30 days");
      else if (daysLeft !== null && daysLeft < 0) score -= 10; // expired — push down

      // If no query at all and no filters — show everything, sorted by deadline
      if (!hasQuery && !hasFilters) {
        score = daysLeft !== null && daysLeft > 0 ? Math.max(1, 100 - daysLeft) : 0;
      }

      results.push({ opportunity: opp, eligibility, relevanceScore: score, rankingReasons });
    }

    // Sort: eligible first, then by relevance score
    if (options.preserveInputOrder) return results;

    return results.sort((a, b) => {
      // Eligible always above non-eligible when profile exists
      if (hasProfile) {
        const aElig = a.eligibility.isEligible ? 2 : a.eligibility.isPartiallyEligible ? 1 : 0;
        const bElig = b.eligibility.isEligible ? 2 : b.eligibility.isPartiallyEligible ? 1 : 0;
        if (aElig !== bElig) return bElig - aElig;
      }
      return b.relevanceScore - a.relevanceScore;
    });
  }

  /* ─── Dashboard recommendations ──────────────────────────────── */
  public static getRecommendations(
    profile: Partial<UserProfile> | null,
    opportunities: Opportunity[]
  ): SearchResult[] {
    if (!profile) {
      return opportunities
        .filter(o => getDeadlineDaysLeft(o.deadline) === null || getDeadlineDaysLeft(o.deadline)! >= 0)
        .slice(0, 6)
        .map(opp => ({
          opportunity: opp,
          eligibility: checkEligibility(opp.rules, {}),
          relevanceScore: 0,
          rankingReasons: [],
        }));
    }
    const baseQuery: SearchQuery = { raw: "", keywords: [], filters: {} };
    const ranked = this.search(baseQuery, profile, opportunities)
      .filter(r => getDeadlineDaysLeft(r.opportunity.deadline) === null || getDeadlineDaysLeft(r.opportunity.deadline)! >= 0);
    const matched = ranked.filter(r => r.eligibility.isEligible || r.eligibility.isPartiallyEligible);
    const unknown = ranked.filter(r => r.eligibility.isUnknown);
    return (matched.length ? matched : unknown).slice(0, 6);
  }

  /* ─── Parse raw query string → SearchQuery ────────────────────── */
  public static parseQuery(rawQuery: string): SearchQuery {
    return QueryParser.parse(rawQuery);
  }
}
