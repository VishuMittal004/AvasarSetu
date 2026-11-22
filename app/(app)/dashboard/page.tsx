"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, ChevronRight, Bookmark, Calendar, TrendingUp, AlertCircle, CheckCircle2, Briefcase, GraduationCap, Landmark, ClipboardList, Wallet } from "lucide-react";
import { useProfileStore } from "@/store/useProfileStore";
import { useSavedStore } from "@/store/useSavedStore";
import { OpportunityService } from "@/services/OpportunityService";
import { SearchService } from "@/services/SearchService";
import { Opportunity, SearchResult } from "@/types";
import { getCurrentTimeMs, getDeadlineDaysLeft, getOpportunityFreshness } from "@/lib/utils";

type DashboardMatch = SearchResult & { matchScore?: number; matchReason?: string };

const CATEGORIES = [
  { name: "Jobs", icon: Briefcase, type: "job" },
  { name: "Scholarships", icon: GraduationCap, type: "scholarship" },
  { name: "Gov Schemes", icon: Landmark, type: "scheme" },
  { name: "Exams", icon: ClipboardList, type: "exam" },
  { name: "Loans/Subsidies", icon: Wallet, type: "subsidy" },
];

const S = {
  page: { padding: "32px", maxWidth: 1200, margin: "0 auto", fontFamily: "inherit" } as React.CSSProperties,
  header: { display: "flex", flexWrap: "wrap" as const, alignItems: "flex-end", justifyContent: "space-between", gap: 16, marginBottom: 32 } as React.CSSProperties,
  h1: { fontSize: 26, fontWeight: 800, color: "#fafafa", letterSpacing: "-0.5px", margin: 0 } as React.CSSProperties,
  sub: { fontSize: 14, color: "#52525b", marginTop: 4, fontWeight: 500 } as React.CSSProperties,
  // Status badge
  badgeAmber: { display: "inline-flex", alignItems: "center", gap: 12, padding: "12px 16px", background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)", borderRadius: 12, textDecoration: "none" } as React.CSSProperties,
  badgeGreen: { display: "inline-flex", alignItems: "center", gap: 12, padding: "12px 16px", background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.2)", borderRadius: 12 } as React.CSSProperties,
  // Search
  searchWrap: { position: "relative" as const, maxWidth: 740, marginBottom: 32 } as React.CSSProperties,
  searchInput: { width: "100%", height: 56, paddingLeft: 48, paddingRight: 160, background: "#111113", border: "1px solid #27272a", borderRadius: 16, color: "#fafafa", fontSize: 15, fontFamily: "inherit", outline: "none" } as React.CSSProperties,
  searchIcon: { position: "absolute" as const, left: 16, top: "50%", transform: "translateY(-50%)", color: "#52525b", display: "flex", pointerEvents: "none" as const } as React.CSSProperties,
  searchBtn: { position: "absolute" as const, right: 6, top: 6, bottom: 6, background: "#10b981", color: "#fff", border: "none", borderRadius: 12, padding: "0 20px", fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "inherit" } as React.CSSProperties,
  // Category grid
  catGrid: { display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12, marginBottom: 32 } as React.CSSProperties,
  catBtn: { background: "#111113", border: "1px solid #27272a", borderRadius: 12, padding: "12px 16px", display: "flex", alignItems: "center", gap: 12, cursor: "pointer", fontFamily: "inherit", transition: "border-color 150ms ease" } as React.CSSProperties,
  catName: { fontWeight: 600, color: "#fafafa", fontSize: 13 } as React.CSSProperties,
  // Grid
  grid: { display: "grid", gridTemplateColumns: "1fr 320px", gap: 24 } as React.CSSProperties,
  // Card
  card: { background: "#111113", border: "1px solid #27272a", borderRadius: 14, padding: "16px 20px", marginBottom: 12, display: "block", textDecoration: "none", color: "inherit", transition: "border-color 150ms ease" } as React.CSSProperties,
  cardHover: "1px solid #10b981",
  typeTag: { fontSize: 10, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.8px", color: "#10b981", background: "rgba(16,185,129,0.1)", padding: "2px 8px", borderRadius: 4, border: "1px solid rgba(16,185,129,0.2)" } as React.CSSProperties,
  eligBadge: { fontSize: 10, fontWeight: 700, color: "#10b981", background: "rgba(16,185,129,0.1)", padding: "2px 8px", borderRadius: 4, display: "inline-flex", alignItems: "center", gap: 4 } as React.CSSProperties,
  partialBadge: { fontSize: 10, fontWeight: 700, color: "#f59e0b", background: "rgba(245,158,11,0.1)", padding: "2px 8px", borderRadius: 4 } as React.CSSProperties,
  cardTitle: { fontSize: 16, fontWeight: 700, color: "#fafafa", margin: "8px 0 4px", letterSpacing: "-0.2px" } as React.CSSProperties,
  cardMeta: { fontSize: 13, color: "#52525b", display: "flex", flexWrap: "wrap" as const, gap: "4px 16px" } as React.CSSProperties,
  // Widget
  widget: { background: "#111113", border: "1px solid #27272a", borderRadius: 14, padding: 20, marginBottom: 16 } as React.CSSProperties,
  widgetTitle: { fontSize: 15, fontWeight: 700, color: "#fafafa", display: "flex", alignItems: "center", gap: 8, marginBottom: 12 } as React.CSSProperties,
  bigNum: { fontSize: 40, fontWeight: 800, color: "#fafafa", lineHeight: 1, letterSpacing: "-2px" } as React.CSSProperties,
  widgetMeta: { fontSize: 13, color: "#52525b", fontWeight: 500, marginTop: 4 } as React.CSSProperties,
  openBtn: { display: "block", width: "100%", textAlign: "center" as const, marginTop: 16, padding: "10px 0", background: "#18181b", color: "#fafafa", fontWeight: 700, fontSize: 13, borderRadius: 10, textDecoration: "none", border: "1px solid #27272a" } as React.CSSProperties,
  // Deadlines widget
  deadlineWidget: { background: "#111113", border: "1px solid rgba(16,185,129,0.2)", borderRadius: 14, padding: 20, position: "relative" as const, overflow: "hidden" } as React.CSSProperties,
  calBtn: { display: "inline-block", background: "#10b981", color: "#fff", fontWeight: 700, fontSize: 13, padding: "8px 16px", borderRadius: 10, textDecoration: "none", marginTop: 12 } as React.CSSProperties,
  // Skeleton
  skeleton: { background: "linear-gradient(90deg,#18181b 25%,#27272a 50%,#18181b 75%)", backgroundSize: "200% 100%", borderRadius: 8, animation: "shimmer 1.5s infinite" } as React.CSSProperties,
};

export default function DashboardPage() {
  const router = useRouter();
  const profile = useProfileStore((state) => state.profile);
  const completeness = useProfileStore((state) => state.completenessScore);
  const savedItems = useSavedStore((state) => state.saved);

  const [searchQuery, setSearchQuery] = useState("");
  const [recommendations, setRecommendations] = useState<DashboardMatch[]>([]);
  const [recommendationSource, setRecommendationSource] = useState<"ai" | "rules">("rules");
  const [savedOpportunities, setSavedOpportunities] = useState<Opportunity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const now = getCurrentTimeMs();
  const savedIds = JSON.stringify(savedItems.map((item) => item.opportunityId));
  const upcomingCount = savedOpportunities.filter((opp) => {
    const daysRemaining = getDeadlineDaysLeft(opp.deadline, now);
    return daysRemaining !== null && daysRemaining > 0 && daysRemaining <= 7;
  }).length;

  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;

    const fetchRecommendations = async () => {
      setIsLoading(true);
      const profileForMatching = profile ? {
        age: profile.age,
        dateOfBirth: profile.dateOfBirth,
        educationLevel: profile.educationLevel,
        degree: profile.degree,
        branch: profile.branch,
        institution: profile.institution,
        graduationYear: profile.graduationYear,
        employmentStatus: profile.employmentStatus,
        yearsOfExperience: profile.yearsOfExperience,
        currentRole: profile.currentRole,
        category: profile.category,
        income: profile.income,
        state: profile.state,
        district: profile.district,
        skills: profile.skills,
        interests: profile.interests,
        preferredLocations: profile.preferredLocations,
      } : null;

      try {
        const response = await fetch("/api/recommendations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ profile: profileForMatching }),
          signal: controller.signal,
        });
        if (!response.ok) throw new Error("Recommendation request failed.");
        const payload = await response.json();
        if (cancelled) return;
        setRecommendations(Array.isArray(payload.results) ? payload.results as DashboardMatch[] : []);
        setRecommendationSource(payload.source === "ai" ? "ai" : "rules");
      } catch {
        if (cancelled) return;
        // Keep the dashboard useful if the AI provider or recommendations API is unavailable.
        try {
          const allOpps = await OpportunityService.getOpportunities();
          const results = SearchService.getRecommendations(profile, allOpps)
            .filter(result => result.eligibility.failedCriteria.length === 0);
          if (!cancelled) {
            setRecommendations(results);
            setRecommendationSource("rules");
          }
        } catch {
          if (!cancelled) setRecommendations([]);
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    fetchRecommendations();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [profile]);

  useEffect(() => {
    let cancelled = false;
    Promise.all((JSON.parse(savedIds) as string[]).map((id) => OpportunityService.getOpportunityById(id)))
      .then((items) => {
        if (!cancelled) setSavedOpportunities(items.filter((item): item is Opportunity => Boolean(item)));
      })
      .catch(() => {
        if (!cancelled) setSavedOpportunities([]);
      });
    return () => { cancelled = true; };
  }, [savedIds]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) router.push(`/explore?q=${encodeURIComponent(searchQuery)}`);
  };

  return (
    <div style={S.page}>
      {/* Header */}
      <header style={S.header}>
        <div>
          <h1 style={S.h1}>Welcome back, {profile?.name?.split(" ")[0] || "Guest"}</h1>
          <p style={S.sub}>Your personalized career and funding discovery engine.</p>
        </div>
        {completeness < 100 ? (
          <Link href="/profile" style={S.badgeAmber}>
            <div style={{ position: "relative", width: 40, height: 40, flexShrink: 0 }}>
              <svg style={{ width: "100%", height: "100%", transform: "rotate(-90deg)" }} viewBox="0 0 36 36">
                <path style={{ stroke: "rgba(245,158,11,0.2)" }} strokeWidth="3" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                <path style={{ stroke: "#f59e0b" }} strokeWidth="3" strokeDasharray={`${completeness}, 100`} strokeLinecap="round" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
              </svg>
              <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: "#f59e0b" }}>{completeness}%</div>
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#f59e0b", display: "flex", alignItems: "center", gap: 4 }}>Profile Incomplete <AlertCircle size={13} /></div>
              <div style={{ fontSize: 12, color: "#a1a1aa", fontWeight: 500 }}>Complete it for better matches</div>
            </div>
          </Link>
        ) : (
          <div style={S.badgeGreen}>
            <CheckCircle2 size={28} color="#10b981" />
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#10b981" }}>Profile Complete</div>
              <div style={{ fontSize: 12, color: "#a1a1aa", fontWeight: 500 }}>Engine is fully optimized</div>
            </div>
          </div>
        )}
      </header>

      {/* Search */}
      <form onSubmit={handleSearch} style={S.searchWrap}>
        <div style={S.searchIcon}><Search size={20} /></div>
        <input
          style={S.searchInput}
          type="text"
          placeholder="Search jobs, scholarships, or schemes..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        <button type="submit" style={S.searchBtn}>Search Engine</button>
      </form>

      {/* Categories */}
      <div style={{ ...S.catGrid, gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))" }}>
        {CATEGORIES.map((cat) => (
          <button key={cat.name} onClick={() => router.push(`/explore?type=${cat.type}`)} style={S.catBtn}
            onMouseEnter={e => (e.currentTarget.style.borderColor = "#10b981")}
            onMouseLeave={e => (e.currentTarget.style.borderColor = "#27272a")}>
            <cat.icon size={22} aria-hidden="true" />
            <span style={S.catName}>{cat.name}</span>
          </button>
        ))}
      </div>

      {/* Main Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 24 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: 24, alignItems: "start" }}>
          {/* Left: Recommendations */}
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, color: "#fafafa", display: "flex", alignItems: "center", gap: 8 }}>
                <TrendingUp size={18} color="#10b981" /> Top Matches
              </h2>
              <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                <span style={{ color: recommendationSource === "ai" ? "#a5b4fc" : "#71717a", fontSize: 11, fontWeight: 600 }}>
                  {recommendationSource === "ai" ? "AI-ranked · eligibility checked separately" : "Rules-ranked · AI unavailable"}
                </span>
                <Link href="/explore" style={{ fontSize: 13, fontWeight: 700, color: "#10b981", display: "flex", alignItems: "center", gap: 2, textDecoration: "none" }}>
                  View all <ChevronRight size={16} />
                </Link>
              </div>
            </div>

            {isLoading ? (
              [1, 2, 3].map(i => (
                <div key={i} style={{ ...S.card, height: 100 }}>
                  <div style={{ ...S.skeleton, height: 14, width: "25%", marginBottom: 12 }} />
                  <div style={{ ...S.skeleton, height: 18, width: "65%", marginBottom: 8 }} />
                  <div style={{ ...S.skeleton, height: 13, width: "40%" }} />
                </div>
              ))
            ) : recommendations.length === 0 ? (
              <div style={{ ...S.card, padding: 32, textAlign: "center" }}>
                <TrendingUp size={36} color="#3f3f46" style={{ margin: "0 auto 12px" }} />
                <h3 style={{ fontWeight: 700, color: "#fafafa", marginBottom: 4 }}>No strong matches yet</h3>
                <p style={{ fontSize: 13, color: "#52525b" }}>Update your profile or broaden your search criteria.</p>
              </div>
            ) : (
              recommendations.map((result) => (
                <Link key={result.opportunity.id} href={`/opportunities/${result.opportunity.id}`} style={S.card}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = "#10b981")}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = "#27272a")}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, marginBottom: 6, flexWrap: "wrap" }}>
                    <span style={S.typeTag}>{result.opportunity.type}</span>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", justifyContent: "flex-end" }}>
                      {result.matchScore !== undefined && (
                        <span style={{ ...S.partialBadge, color: "#a5b4fc", background: "rgba(99,102,241,0.12)" }}>
                          AI fit {result.matchScore}/100
                        </span>
                      )}
                      {result.eligibility.isEligible ? (
                        <span style={S.eligBadge}><CheckCircle2 size={11} /> Rules match</span>
                      ) : result.eligibility.isPartiallyEligible ? (
                        <span style={S.partialBadge}>Potential match</span>
                      ) : result.eligibility.isUnknown ? (
                        <span style={S.partialBadge}>Eligibility unknown</span>
                      ) : null}
                    </div>
                  </div>
                  <h3 style={S.cardTitle}>{result.opportunity.title}</h3>
                  <div style={S.cardMeta}>
                    <span>{result.opportunity.issuingAuthority}</span>
                    {result.opportunity.location && <span>{result.opportunity.location}</span>}
                    {result.opportunity.salaryOrAmount && <span style={{ color: "#10b981", fontWeight: 600 }}>{result.opportunity.salaryOrAmount}</span>}
                  </div>
                  <p style={{ fontSize: 11, color: "#71717a", marginTop: 8 }}>
                    {getOpportunityFreshness(
                      result.opportunity.lastVerifiedAt,
                      result.opportunity.type,
                      undefined,
                      result.opportunity.isDemoRecord === true || result.opportunity.id.startsWith("demo-"),
                    ).label}
                  </p>
                  {result.matchReason && <p style={{ fontSize: 12, color: "#a1a1aa", marginTop: 8 }}>Why it fits: {result.matchReason}</p>}
                </Link>
              ))
            )}
          </div>

          {/* Right: Widgets */}
          <div>
            {/* Tracking */}
            <div style={S.widget}>
              <div style={S.widgetTitle}><Bookmark size={16} color="#10b981" /> Tracking</div>
              <div style={S.bigNum}>{savedItems.length}</div>
              <div style={S.widgetMeta}>Saved opportunities</div>
              <Link href="/saved" style={S.openBtn}>Open Board</Link>
            </div>
            {/* Deadlines */}
            <div style={S.deadlineWidget}>
              <div style={{ position: "absolute", top: 0, right: 0, padding: 16, opacity: 0.06 }}>
                <Calendar size={80} color="#10b981" />
              </div>
              <div style={{ fontSize: 15, fontWeight: 700, color: "#fafafa", display: "flex", alignItems: "center", gap: 8, marginBottom: 8, position: "relative" }}>
                <Calendar size={16} color="#10b981" /> Deadlines
              </div>
              <p style={{ fontSize: 13, color: "#52525b", lineHeight: 1.6, position: "relative" }}>
                You have <strong style={{ color: "#fafafa" }}>{upcomingCount}</strong> approaching deadline{upcomingCount === 1 ? "" : "s"} in the next 7 days.
              </p>
              <Link href="/calendar" style={S.calBtn}>View Calendar</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
