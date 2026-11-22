"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Search, X, BookmarkPlus, MapPin, Building,
  ChevronRight, AlertCircle, CheckCircle2, SlidersHorizontal, Info, Calendar, Zap,
} from "lucide-react";
import { useProfileStore } from "@/store/useProfileStore";
import { useSavedStore } from "@/store/useSavedStore";
import { usePreferencesStore } from "@/store/usePreferencesStore";
import { SearchService } from "@/services/SearchService";
import { OpportunityService } from "@/services/OpportunityService";
import { getCurrentTimeMs, getDeadlineDaysLeft, getOpportunityFreshness } from "@/lib/utils";
import { SearchResult, OpportunityType, UserCategory, EducationLevel, Opportunity } from "@/types";

/* ─── Design tokens ──────────────────────────────────────────── */
const C = {
  bg: "#09090b", surface: "#111113", elevated: "#18181b",
  border: "#27272a", text: "#fafafa", sec: "#a1a1aa", muted: "#52525b",
  accent: "#10b981", accentSub: "rgba(16,185,129,0.08)", accentRing: "rgba(16,185,129,0.25)",
  danger: "#ef4444", warn: "#f59e0b",
};

const TYPES: { label: string; value: OpportunityType }[] = [
  { label: "Jobs",         value: "job" },
  { label: "Scholarships", value: "scholarship" },
  { label: "Gov Schemes",  value: "scheme" },
  { label: "Exams",        value: "exam" },
  { label: "Internships",  value: "internship" },
  { label: "Subsidies",    value: "subsidy" },
];

const CATEGORIES: { label: string; value: UserCategory }[] = [
  { label: "General / UR", value: "General" },
  { label: "OBC",          value: "OBC" },
  { label: "SC",           value: "SC" },
  { label: "ST",           value: "ST" },
  { label: "EWS",          value: "EWS" },
];

const EDUCATION_LEVELS: { label: string; value: EducationLevel }[] = [
  { label: "10th Pass",      value: "10th-pass" },
  { label: "12th Pass",      value: "12th-pass" },
  { label: "Undergraduate",  value: "undergraduate" },
  { label: "Graduate",       value: "graduate" },
  { label: "Post Graduate",  value: "postgraduate" },
  { label: "Doctorate",      value: "doctorate" },
];

const INDIAN_STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
  "Delhi", "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand",
  "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur",
  "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab", "Rajasthan",
  "Sikkim", "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh",
  "Uttarakhand", "West Bengal",
];

function CheckBox({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <div
      onClick={onChange}
      style={{
        width: 16, height: 16, borderRadius: 4, flexShrink: 0,
        border: `1.5px solid ${checked ? C.accent : C.border}`,
        background: checked ? C.accent : C.elevated,
        display: "flex", alignItems: "center", justifyContent: "center",
        cursor: "pointer", transition: "all 120ms",
      }}
    >
      {checked && <CheckCircle2 size={10} color="#fff" />}
    </div>
  );
}

function FilterSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "1px", textTransform: "uppercase", color: C.muted, marginBottom: 10 }}>
        {title}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {children}
      </div>
    </div>
  );
}

function FilterRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: () => void }) {
  return (
    <label
      style={{ display: "flex", alignItems: "center", gap: 10, padding: "5px 6px", borderRadius: 6, cursor: "pointer", transition: "background 120ms", background: checked ? C.accentSub : "transparent" }}
      onClick={onChange}
    >
      <CheckBox checked={checked} onChange={() => {}} />
      <span style={{ fontSize: 13, fontWeight: 500, color: checked ? C.accent : C.sec }}>{label}</span>
    </label>
  );
}

function ExploreContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const profile = useProfileStore(s => s.profile);
  const { saved, saveOpportunity, unsaveOpportunity } = useSavedStore();
  const lowDataMode = usePreferencesStore(state => state.lowDataMode);

  const [rawQuery, setRawQuery]       = useState(searchParams.get("q") || "");
  const [inputVal, setInputVal]       = useState(searchParams.get("q") || "");
  const [allOpps, setAllOpps]         = useState<Opportunity[]>([]);
  const [results, setResults]         = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading]     = useState(true);
  const [offlineQueryQueued, setOfflineQueryQueued] = useState(false);
  const [searchRefresh, setSearchRefresh] = useState(0);
  const [mobileOpen, setMobileOpen]   = useState(false);

  /* Filters */
  const [selTypes, setSelTypes]       = useState<OpportunityType[]>(
    searchParams.get("type") ? [searchParams.get("type") as OpportunityType] : []
  );
  const [selCategories, setSelCategories] = useState<UserCategory[]>([]);
  const [selEducation, setSelEducation]   = useState<EducationLevel[]>([]);
  const [selState, setSelState]           = useState("");
  const [onlyEligible, setOnlyEligible]   = useState(false);
  const [onlyActive, setOnlyActive]       = useState(true);   // hide expired by default

  /* Load all opportunities once */
  useEffect(() => {
    OpportunityService.getOpportunities().then(opps => {
      setAllOpps(opps);
      setIsLoading(false);
    });
  }, []);

  useEffect(() => {
    const retryWhenOnline = () => setSearchRefresh(value => value + 1);
    window.addEventListener("online", retryWhenOnline);
    return () => window.removeEventListener("online", retryWhenOnline);
  }, []);

  /* Re-run search whenever any filter or query changes */
  useEffect(() => {
    if (allOpps.length === 0) return;

    const run = async () => {
      let baseOpps = allOpps;

      // If user typed a query, try vector/fulltext search via API first
      if (rawQuery.trim().length > 1) {
        setOfflineQueryQueued(false);
        try {
          const res = await fetch("/api/search", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ query: rawQuery.trim(), profile, limit: lowDataMode ? 25 : 50 }),
          });
          if (res.ok) {
            const data = await res.json();
            setOfflineQueryQueued(Boolean(data.queued));
            if (data.results && data.results.length > 0) {
              // API returns SearchResult[] already scored — apply local filters then set
              let filtered: SearchResult[] = data.results;
              if (selTypes.length > 0)
                filtered = filtered.filter(r => selTypes.includes(r.opportunity.type));
              if (selCategories.length > 0)
                filtered = filtered.filter(r =>
                  !r.opportunity.rules.allowedCategories?.length ||
                  r.opportunity.rules.allowedCategories.some(c => selCategories.includes(c as UserCategory))
                );
              if (selEducation.length > 0)
                filtered = filtered.filter(r => {
                  const req = r.opportunity.rules.requiredEducation;
                  if (!req || req.length === 0) return true;
                  return selEducation.some(e => req.includes(e));
                });
              if (selState)
                filtered = filtered.filter(r => {
                  const loc = (r.opportunity.location || r.opportunity.state || "").toLowerCase();
                  return loc.includes("pan") || loc === "" || loc.includes(selState.toLowerCase());
                });
              if (onlyEligible)
                filtered = filtered.filter(r => r.eligibility.isEligible);
              if (onlyActive)
                filtered = filtered.filter(r => getDeadlineDaysLeft(r.opportunity.deadline) === null || getDeadlineDaysLeft(r.opportunity.deadline)! >= 0);
              if (filtered.length > 0) {
                setResults(filtered);
                return;
              }
              // A vector candidate list can be entirely removed by client-side
              // filters (especially Hide Expired). Let lexical search try the
              // full catalogue before displaying an empty state.
            }
          }
        } catch {
          // fall through to local search
        }
      }

      // No query or API failed — do local client-side search
      const sq = SearchService.parseQuery(rawQuery);
      if (selTypes.length > 0)      sq.filters.type      = selTypes;
      if (selCategories.length > 0) sq.filters.category  = selCategories;
      if (selEducation.length > 0)  sq.filters.education = selEducation;
      if (selState)                 sq.filters.location   = [selState];

      let res = SearchService.search(sq, profile, baseOpps);
      if (onlyEligible)
        res = res.filter(r => r.eligibility.isEligible);
      if (onlyActive)
        res = res.filter(r => getDeadlineDaysLeft(r.opportunity.deadline) === null || getDeadlineDaysLeft(r.opportunity.deadline)! >= 0);
      setResults(res);
    };

    run();
  }, [rawQuery, selTypes, selCategories, selEducation, selState, onlyEligible, onlyActive, profile, allOpps, searchRefresh, lowDataMode]);

  const handleSearch = useCallback(() => {
    const trimmed = inputVal.trim();
    setRawQuery(trimmed);
    if (trimmed) router.replace(`/explore?q=${encodeURIComponent(trimmed)}`);
    else router.replace("/explore");
  }, [inputVal, router]);

  const clearAll = () => {
    setInputVal(""); setRawQuery("");
    setSelTypes([]); setSelCategories([]); setSelEducation([]);
    setSelState(""); setOnlyEligible(false);
    router.replace("/explore");
  };

  const toggleArr = <T,>(arr: T[], val: T, set: (v: T[]) => void) =>
    set(arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val]);

  const activeFilterCount =
    selTypes.length + selCategories.length + selEducation.length +
    (selState ? 1 : 0) + (onlyEligible ? 1 : 0);

  const rememberSearchContext = () => {
    if (typeof window === "undefined") return;
    if (rawQuery.trim()) sessionStorage.setItem("cc-last-search-query", rawQuery.trim());
    else sessionStorage.removeItem("cc-last-search-query");
  };

  /* ── Sidebar JSX ─────────────────────────────────────────────── */
  const sidebar = (
    <aside style={{
      width: 260, flexShrink: 0, background: C.surface,
      borderRight: `1px solid ${C.border}`, display: "flex",
      flexDirection: "column", height: "100%", overflowY: "auto",
    }}>
      {/* Sidebar header */}
      <div style={{ padding: "16px 20px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
        <span style={{ fontWeight: 700, color: C.text, fontSize: 14, display: "flex", alignItems: "center", gap: 8 }}>
          <SlidersHorizontal size={15} style={{ color: C.accent }} /> Filters
          {activeFilterCount > 0 && (
            <span style={{ fontSize: 11, fontWeight: 700, background: C.accent, color: "#fff", borderRadius: 9999, padding: "1px 7px" }}>
              {activeFilterCount}
            </span>
          )}
        </span>
        {activeFilterCount > 0 && (
          <button onClick={clearAll} style={{ background: "none", border: "none", cursor: "pointer", color: C.muted, fontSize: 12, fontWeight: 700, fontFamily: "inherit" }}>
            Clear all
          </button>
        )}
      </div>

      <div style={{ flex: 1, padding: "20px", display: "flex", flexDirection: "column", gap: 24 }}>

        {/* Opportunity type */}
        <FilterSection title="Opportunity Type">
          {TYPES.map(t => (
            <FilterRow
              key={t.value}
              label={t.label}
              checked={selTypes.includes(t.value)}
              onChange={() => toggleArr(selTypes, t.value, setSelTypes)}
            />
          ))}
        </FilterSection>

        {/* Category */}
        <FilterSection title="Category (Caste)">
          {CATEGORIES.map(c => (
            <FilterRow
              key={c.value}
              label={c.label}
              checked={selCategories.includes(c.value)}
              onChange={() => toggleArr(selCategories, c.value, setSelCategories)}
            />
          ))}
        </FilterSection>

        {/* Education level */}
        <FilterSection title="Education Level">
          {EDUCATION_LEVELS.map(e => (
            <FilterRow
              key={e.value}
              label={e.label}
              checked={selEducation.includes(e.value)}
              onChange={() => toggleArr(selEducation, e.value, setSelEducation)}
            />
          ))}
        </FilterSection>

        {/* State */}
        <FilterSection title="State / Location">
          <select
            value={selState}
            onChange={e => setSelState(e.target.value)}
            style={{
              width: "100%", height: 36, padding: "0 30px 0 10px", background: C.elevated,
              border: `1px solid ${selState ? C.accent : C.border}`, borderRadius: 8,
              color: selState ? C.text : C.muted, fontSize: 13, fontFamily: "inherit",
              outline: "none", appearance: "none",
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2352525b' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`,
              backgroundRepeat: "no-repeat", backgroundPosition: "right 10px center",
            }}
          >
            <option value="">All states / Pan-India</option>
            {INDIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </FilterSection>

        {/* Smart filters */}
        <FilterSection title="Smart Filters">
          <label
            style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "10px 12px", borderRadius: 10, border: `1px solid ${onlyEligible ? C.accentRing : C.border}`, background: onlyEligible ? C.accentSub : C.elevated, cursor: "pointer" }}
            onClick={() => setOnlyEligible(!onlyEligible)}
          >
            <CheckBox checked={onlyEligible} onChange={() => {}} />
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: onlyEligible ? C.accent : C.sec }}>Only Eligible</div>
              <div style={{ fontSize: 11, color: C.muted }}>Hide opportunities you do not qualify for</div>
            </div>
          </label>

          <label
            style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", borderRadius: 8, cursor: "pointer", marginTop: 6 }}
            onClick={() => setOnlyActive(!onlyActive)}
          >
            <CheckBox checked={onlyActive} onChange={() => {}} />
            <span style={{ fontSize: 13, color: onlyActive ? C.accent : C.sec, fontWeight: 500 }}>Hide Expired</span>
          </label>
        </FilterSection>
      </div>
    </aside>
  );

  return (
    <div style={{ display: "flex", height: "100%", fontFamily: "Inter, sans-serif", background: C.bg, position: "relative" }}>

      {/* Desktop sidebar */}
      <div style={{ display: "none" }} className="explore-sidebar-desktop">
        {sidebar}
      </div>

      <style>{`
        @media (min-width: 768px) {
          .explore-sidebar-desktop { display: flex !important; }
          .explore-mobile-btn { display: none !important; }
        }
      `}</style>

      {/* Mobile sidebar overlay */}
      {mobileOpen && (
        <div style={{ position: "fixed", inset: 0, zIndex: 100, background: "rgba(0,0,0,0.6)" }} onClick={() => setMobileOpen(false)}>
          <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 300 }} onClick={e => e.stopPropagation()}>
            {sidebar}
          </div>
        </div>
      )}

      {/* Main area */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minWidth: 0 }}>

        {/* Top bar */}
        <div style={{ padding: "16px 20px", borderBottom: `1px solid ${C.border}`, background: C.surface, position: "sticky", top: 0, zIndex: 10 }}>
          <form onSubmit={e => { e.preventDefault(); handleSearch(); }} style={{ display: "flex", gap: 10 }}>
            {/* Mobile filter button */}
            <button
              type="button"
              className="explore-mobile-btn"
              onClick={() => setMobileOpen(true)}
              style={{ height: 44, padding: "0 14px", background: C.elevated, border: `1px solid ${activeFilterCount > 0 ? C.accent : C.border}`, borderRadius: 10, color: activeFilterCount > 0 ? C.accent : C.muted, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, fontFamily: "inherit", fontWeight: 700, fontSize: 13, flexShrink: 0 }}
            >
              <SlidersHorizontal size={15} />
              {activeFilterCount > 0 && <span style={{ background: C.accent, color: "#fff", borderRadius: 9999, fontSize: 10, fontWeight: 700, padding: "1px 6px" }}>{activeFilterCount}</span>}
            </button>

            {/* Search input */}
            <div style={{ flex: 1, position: "relative" }}>
              <div style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: C.muted, pointerEvents: "none", display: "flex" }}>
                <Search size={17} />
              </div>
              <input
                type="text"
                placeholder="Search jobs, scholarships, schemes, skills..."
                value={inputVal}
                onChange={e => setInputVal(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleSearch()}
                style={{ width: "100%", height: 44, paddingLeft: 42, paddingRight: 14, background: C.elevated, border: `1px solid ${C.border}`, borderRadius: 10, color: C.text, fontSize: 14, fontFamily: "inherit", outline: "none", boxSizing: "border-box" }}
              />
              {inputVal && (
                <button type="button" onClick={() => { setInputVal(""); setRawQuery(""); router.replace("/explore"); }} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: C.muted, cursor: "pointer", display: "flex", padding: 2 }}>
                  <X size={15} />
                </button>
              )}
            </div>

            <button type="submit" style={{ height: 44, padding: "0 20px", background: C.accent, color: "#fff", border: "none", borderRadius: 10, fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "inherit", flexShrink: 0 }}>
              Search
            </button>
          </form>

          {/* Result count + active filter chips */}
          <div style={{ marginTop: 10, display: "flex", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
            <span style={{ fontSize: 13, color: C.muted }}>
              <strong style={{ color: C.text }}>{results.length}</strong> result{results.length !== 1 ? "s" : ""}
              {rawQuery && <> for &ldquo;<strong style={{ color: C.accent }}>{rawQuery}</strong>&rdquo;</>}
            </span>

            {/* Active filter pills */}
            {selTypes.map(t => (
              <span key={t} onClick={() => toggleArr(selTypes, t, setSelTypes)} style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "2px 8px", background: C.accentSub, color: C.accent, fontSize: 11, fontWeight: 700, borderRadius: 9999, border: `1px solid ${C.accentRing}`, cursor: "pointer" }}>
                {TYPES.find(x => x.value === t)?.label} <X size={10} />
              </span>
            ))}
            {selCategories.map(c => (
              <span key={c} onClick={() => toggleArr(selCategories, c, setSelCategories)} style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "2px 8px", background: "rgba(99,102,241,0.1)", color: "#a5b4fc", fontSize: 11, fontWeight: 700, borderRadius: 9999, border: "1px solid rgba(99,102,241,0.25)", cursor: "pointer" }}>
                {c} <X size={10} />
              </span>
            ))}
            {selState && (
              <span onClick={() => setSelState("")} style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "2px 8px", background: "rgba(245,158,11,0.08)", color: "#f59e0b", fontSize: 11, fontWeight: 700, borderRadius: 9999, border: "1px solid rgba(245,158,11,0.25)", cursor: "pointer" }}>
                <MapPin size={10} /> {selState} <X size={10} />
              </span>
            )}
            {onlyEligible && (
              <span onClick={() => setOnlyEligible(false)} style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "2px 8px", background: C.accentSub, color: C.accent, fontSize: 11, fontWeight: 700, borderRadius: 9999, border: `1px solid ${C.accentRing}`, cursor: "pointer" }}>
                Eligible only <X size={10} />
              </span>
            )}
          </div>
          {offlineQueryQueued && (
            <p role="status" style={{ marginTop: 8, color: C.muted, fontSize: 12 }}>
              You&apos;re offline. Cached opportunities are shown when available; this search will retry when you reconnect.
            </p>
          )}
        </div>

        {/* Results list */}
        <div style={{ flex: 1, overflowY: "auto", padding: 20 }}>
          {isLoading ? (
            <div style={{ display: "flex", justifyContent: "center", padding: 64 }}>
              <div className="spinner" />
            </div>
          ) : results.length === 0 ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "64px 24px", textAlign: "center", background: C.surface, border: `1px dashed ${C.border}`, borderRadius: 20 }}>
              <Search size={40} style={{ color: C.muted, marginBottom: 16 }} />
              <h3 style={{ fontSize: 18, fontWeight: 700, color: C.text, marginBottom: 8 }}>No results found</h3>
              <p style={{ fontSize: 14, color: C.muted, maxWidth: 320, lineHeight: 1.6, marginBottom: 20 }}>
                Try different keywords, broaden your filters, or complete your profile for better matches.
              </p>
              <button onClick={clearAll} style={{ height: 36, padding: "0 20px", background: C.elevated, border: `1px solid ${C.border}`, borderRadius: 8, color: C.sec, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                Clear All Filters
              </button>
            </div>
          ) : (
            <div style={{ maxWidth: 900, margin: "0 auto", display: "flex", flexDirection: "column", gap: 12 }}>
              {results.map(res => {
                const opp = res.opportunity;
                const isSaved = saved.some(s => s.opportunityId === opp.id);
                const now = getCurrentTimeMs();
                const daysLeft = getDeadlineDaysLeft(opp.deadline, now);
                const isExpired = daysLeft !== null && daysLeft < 0;
                const isUrgent = daysLeft !== null && daysLeft >= 0 && daysLeft <= 7;
                const isPresentationRecord = opp.isDemoRecord === true || opp.id.startsWith("demo-");
                const freshness = getOpportunityFreshness(
                  opp.lastVerifiedAt,
                  opp.type,
                  now,
                  isPresentationRecord,
                );

                return (
                  <div
                    key={opp.id}
                    style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: 20, display: "flex", gap: 16, transition: "border-color 150ms" }}
                    onMouseEnter={e => (e.currentTarget.style.borderColor = C.accent)}
                    onMouseLeave={e => (e.currentTarget.style.borderColor = C.border)}
                  >
                    {/* Main info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      {/* Tags row */}
                      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 6, marginBottom: 10 }}>
                        <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.8px", color: C.accent, background: C.accentSub, padding: "2px 8px", borderRadius: 4, border: `1px solid ${C.accentRing}` }}>
                          {opp.type}
                        </span>
                        {res.eligibility.isEligible ? (
                          <span style={{ fontSize: 10, fontWeight: 700, color: "#10b981", background: "rgba(16,185,129,0.1)", padding: "2px 8px", borderRadius: 4, display: "flex", alignItems: "center", gap: 3 }}>
                            <CheckCircle2 size={10} /> Eligible
                          </span>
                        ) : res.eligibility.isPartiallyEligible ? (
                          <span style={{ fontSize: 10, fontWeight: 700, color: C.warn, background: "rgba(245,158,11,0.1)", padding: "2px 8px", borderRadius: 4, display: "flex", alignItems: "center", gap: 3 }}>
                            <AlertCircle size={10} /> Partial Match
                          </span>
                        ) : res.eligibility.isUnknown ? (
                          <span style={{ fontSize: 10, fontWeight: 700, color: C.muted, background: C.elevated, padding: "2px 8px", borderRadius: 4 }}>
                            Add profile details
                          </span>
                        ) : (
                          <span style={{ fontSize: 10, fontWeight: 700, color: C.danger, background: "rgba(239,68,68,0.08)", padding: "2px 8px", borderRadius: 4 }}>
                            Not Eligible
                          </span>
                        )}

                        {isUrgent && !isExpired && (
                          <span style={{ fontSize: 10, fontWeight: 700, color: C.warn, background: "rgba(245,158,11,0.08)", padding: "2px 8px", borderRadius: 4, border: "1px solid rgba(245,158,11,0.25)" }}>
                            <><Zap size={11} aria-hidden="true" /> {daysLeft}d left</>
                          </span>
                        )}
                        {isExpired && (
                          <span style={{ fontSize: 10, fontWeight: 700, color: C.danger, background: "rgba(239,68,68,0.08)", padding: "2px 8px", borderRadius: 4 }}>
                            Expired
                          </span>
                        )}

                        <span style={{ marginLeft: "auto", fontSize: 11, fontWeight: 600, color: C.muted, background: C.elevated, border: `1px solid ${C.border}`, padding: "1px 6px", borderRadius: 4 }}>
                          Score: {res.relevanceScore}
                        </span>
                      </div>

                      {/* Title */}
                      <h3 style={{ fontSize: 15, fontWeight: 700, color: C.text, margin: "0 0 6px", letterSpacing: "-0.2px" }}>
                        <Link href={`/opportunities/${opp.id}`} onClick={rememberSearchContext} style={{ color: "inherit", textDecoration: "none" }}>
                          {opp.title}
                        </Link>
                      </h3>

                      {/* Meta */}
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 14px", fontSize: 12, color: C.muted, marginBottom: 8 }}>
                        <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                          <Building size={12} /> {opp.issuingAuthority}
                        </span>
                        {opp.location && (
                          <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                            <MapPin size={12} /> {opp.location}
                          </span>
                        )}
                        {opp.salaryOrAmount && (
                          <span style={{ color: C.accent, fontWeight: 700 }}>{opp.salaryOrAmount}</span>
                        )}
                        <span title={opp.lastVerifiedAt ? new Date(opp.lastVerifiedAt).toLocaleString("en-IN") : undefined} style={{ color: freshness.isStale ? C.danger : C.muted }}>
                          {freshness.isStale ? `May be outdated · ${freshness.label.toLowerCase()}` : freshness.label}
                        </span>
                      </div>

                      {/* Description snippet */}
                      <p style={{ fontSize: 13, color: C.sec, lineHeight: 1.6, margin: "0 0 10px", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as const, overflow: "hidden" }}>
                        {opp.description}
                      </p>

                      {/* Ranking reasons */}
                      {res.rankingReasons.length > 0 && (
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                          {res.rankingReasons.slice(0, 4).map((r, i) => (
                            <span key={i} style={{ fontSize: 10, fontWeight: 600, color: C.muted, background: C.elevated, border: `1px solid ${C.border}`, padding: "2px 6px", borderRadius: 4 }}>
                              +{r.score} {r.factor}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Right column */}
                    <div style={{ width: 130, flexShrink: 0, display: "flex", flexDirection: "column", justifyContent: "space-between", borderLeft: `1px solid ${C.border}`, paddingLeft: 16 }}>
                      <div>
                        <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.8px", color: C.muted, marginBottom: 4, display: "flex", alignItems: "center", gap: 4 }}>
                          <Calendar size={10} /> Deadline
                        </div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: isExpired ? C.danger : isUrgent ? C.warn : C.text }}>
                          {opp.deadline ? new Date(opp.deadline).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "Not listed"}
                        </div>
                      </div>

                      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 12 }}>
                        <button
                          onClick={() => isSaved ? unsaveOpportunity(opp.id) : saveOpportunity(opp.id)}
                          style={{ height: 34, background: isSaved ? C.accentSub : C.elevated, border: `1px solid ${isSaved ? C.accentRing : C.border}`, borderRadius: 8, color: isSaved ? C.accent : C.sec, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 5 }}
                        >
                          <BookmarkPlus size={13} /> {isSaved ? "Saved" : "Save"}
                        </button>
                        <Link
                          href={`/opportunities/${opp.id}`}
                          onClick={rememberSearchContext}
                          style={{ height: 34, background: C.accent, border: "none", borderRadius: 8, color: "#fff", fontSize: 12, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", gap: 4, textDecoration: "none" }}
                        >
                          View <ChevronRight size={12} />
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ExplorePage() {
  return (
    <Suspense fallback={<div style={{ display: "flex", justifyContent: "center", padding: 64 }}><div className="spinner" /></div>}>
      <ExploreContent />
    </Suspense>
  );
}
