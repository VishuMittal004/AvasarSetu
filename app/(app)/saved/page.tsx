"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bookmark, Calendar, MapPin, Building, ExternalLink, Trash2 } from "lucide-react";
import { useSavedStore } from "@/store/useSavedStore";
import { getCurrentTimeMs, getDeadlineDaysLeft, getOpportunityFreshness } from "@/lib/utils";
import { OpportunityService } from "@/services/OpportunityService";
import { Opportunity, ApplicationStatus } from "@/types";

const C = {
  bg: "#09090b", surface: "#111113", elevated: "#18181b",
  border: "#27272a", text: "#fafafa", sec: "#a1a1aa", muted: "#52525b",
  accent: "#10b981", danger: "#ef4444",
};

const STATUS_COLOR: Record<string, string> = {
  "applied": "rgba(59,130,246,0.1)",
  "in-progress": "rgba(245,158,11,0.1)",
  "expired": "rgba(239,68,68,0.1)",
  "saved": C.elevated,
};
const STATUS_TEXT: Record<string, string> = {
  "applied": "#3b82f6", "in-progress": "#f59e0b", "expired": C.danger, "saved": C.sec,
};

export default function SavedPage() {
  const { saved, updateStatus, unsaveOpportunity } = useSavedStore();
  const [opportunities, setOpportunities] = useState<Record<string, Opportunity>>({});
  const [activeTab, setActiveTab] = useState<"all" | ApplicationStatus>("all");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchSaved = async () => {
      setIsLoading(true);
      const fetched: Record<string, Opportunity> = {};
      for (const item of saved) {
        const opp = await OpportunityService.getOpportunityById(item.opportunityId);
        if (opp) fetched[opp.id] = opp;
      }
      setOpportunities(prev => ({ ...prev, ...fetched }));
      setIsLoading(false);
    };
    fetchSaved();
  }, [saved]);

  const filteredSaved = saved.filter(item => activeTab === "all" || item.status === activeTab);
  const TABS = ["all", "saved", "in-progress", "applied", "expired"] as const;

  return (
    <div style={{ padding: "32px 24px", maxWidth: 900, margin: "0 auto", fontFamily: "inherit", paddingBottom: 80 }}>
      {/* Header */}
      <header style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: C.text, letterSpacing: "-0.5px", display: "flex", alignItems: "center", gap: 10 }}>
          <Bookmark size={24} color={C.accent} /> Saved Opportunities
        </h1>
        <p style={{ fontSize: 14, color: C.muted, marginTop: 4, fontWeight: 500 }}>
          Track and manage your applications. Update statuses as you progress.
        </p>
      </header>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, borderBottom: `1px solid ${C.border}`, marginBottom: 24, overflowX: "auto" }}>
        {TABS.map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} style={{
            padding: "10px 16px", fontSize: 13, fontWeight: 700, textTransform: "capitalize",
            whiteSpace: "nowrap", background: "none", border: "none", cursor: "pointer",
            fontFamily: "inherit", borderBottom: `2px solid ${activeTab === tab ? C.accent : "transparent"}`,
            color: activeTab === tab ? C.accent : C.muted, marginBottom: -1,
            transition: "color 150ms ease, border-color 150ms ease",
          }}>
            {tab.replace("-", " ")}
            <span style={{ marginLeft: 6, background: C.elevated, color: C.muted, padding: "1px 6px", borderRadius: 4, fontSize: 10, fontWeight: 700 }}>
              {tab === "all" ? saved.length : saved.filter(s => s.status === tab).length}
            </span>
          </button>
        ))}
      </div>

      {/* Content */}
      {isLoading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: 48 }}>
          <div className="spinner" />
        </div>
      ) : filteredSaved.length === 0 ? (
        <div style={{ textAlign: "center", padding: "48px 24px", background: C.surface, border: `1px dashed ${C.border}`, borderRadius: 20 }}>
          <Bookmark size={40} color={C.muted} style={{ margin: "0 auto 16px" }} />
          <h3 style={{ fontSize: 18, fontWeight: 700, color: C.text, marginBottom: 8 }}>No items found</h3>
          <p style={{ fontSize: 14, color: C.muted, marginBottom: 20 }}>Save opportunities from the Explore page to track them here.</p>
          <Link href="/explore" style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "10px 24px", background: C.accent, color: "#fff", fontWeight: 700, fontSize: 13, borderRadius: 10, textDecoration: "none" }}>
            Explore Opportunities
          </Link>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {filteredSaved.map(item => {
            const opp = opportunities[item.opportunityId];
            if (!opp) return null;
            const daysLeft = getDeadlineDaysLeft(opp.deadline, getCurrentTimeMs());
            const isUrgent = daysLeft !== null && daysLeft <= 7 && item.status !== "applied" && item.status !== "expired";
            const isPresentationRecord = opp.isDemoRecord === true || opp.id.startsWith("demo-");
            const freshness = getOpportunityFreshness(
              opp.lastVerifiedAt,
              opp.type,
              undefined,
              isPresentationRecord,
            );

            return (
              <div key={item.id} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: 20, display: "flex", gap: 20, flexWrap: "wrap" }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = C.accent)}
                onMouseLeave={e => (e.currentTarget.style.borderColor = C.border)}>

                {/* Left */}
                <div style={{ flex: 1, minWidth: 200 }}>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
                    <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.8px", color: C.accent, background: "rgba(16,185,129,0.1)", padding: "2px 8px", borderRadius: 4, border: "1px solid rgba(16,185,129,0.2)" }}>
                      {opp.type}
                    </span>
                    <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", color: STATUS_TEXT[item.status] || C.sec, background: STATUS_COLOR[item.status] || C.elevated, padding: "2px 8px", borderRadius: 4 }}>
                      {item.status.replace("-", " ")}
                    </span>
                  </div>
                  <h3 style={{ fontSize: 16, fontWeight: 700, color: C.text, marginBottom: 6, letterSpacing: "-0.2px" }}>
                    <Link href={`/opportunities/${opp.id}`} style={{ color: "inherit", textDecoration: "none" }}>{opp.title}</Link>
                  </h3>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 16px", fontSize: 13, color: C.muted }}>
                    <span style={{ display: "flex", alignItems: "center", gap: 4 }}><Building size={13} /> {opp.issuingAuthority}</span>
                    {opp.location && <span style={{ display: "flex", alignItems: "center", gap: 4 }}><MapPin size={13} /> {opp.location}</span>}
                    <span style={{ display: "flex", alignItems: "center", gap: 4, color: isUrgent ? C.danger : C.muted, fontWeight: isUrgent ? 700 : 500 }}>
                      <Calendar size={13} /> {opp.deadline ? `Due ${new Date(opp.deadline).toLocaleDateString()}` : "Deadline not listed"}
                      {isUrgent && ` — ${daysLeft}d left!`}
                    </span>
                  </div>
                  <p style={{ fontSize: 11, color: freshness.isStale ? C.danger : C.muted, marginTop: 8 }}>
                    {freshness.isStale ? `May be outdated · ${freshness.label.toLowerCase()}` : freshness.label}
                  </p>
                </div>

                {/* Right */}
                <div style={{ display: "flex", flexDirection: "column", gap: 10, minWidth: 200, borderLeft: `1px solid ${C.border}`, paddingLeft: 20 }}>
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.8px", color: C.muted, marginBottom: 6 }}>Pipeline Status</div>
                    <select
                      value={item.status}
                      onChange={e => updateStatus(item.opportunityId, e.target.value as ApplicationStatus)}
                      style={{ width: "100%", height: 36, background: C.elevated, border: `1px solid ${C.border}`, borderRadius: 8, color: C.text, fontSize: 13, fontWeight: 600, fontFamily: "inherit", outline: "none", padding: "0 32px 0 10px", appearance: "none", cursor: "pointer" }}
                    >
                      <option value="saved">Saved / Reviewing</option>
                      <option value="in-progress">Application In Progress</option>
                      <option value="applied">Successfully Applied</option>
                      <option value="expired">Deadline Passed</option>
                    </select>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={() => unsaveOpportunity(opp.id)} title="Remove" style={{ width: 36, height: 36, background: "none", border: `1px solid ${C.border}`, borderRadius: 8, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: C.muted, flexShrink: 0 }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = C.danger; e.currentTarget.style.color = C.danger; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.muted; }}>
                      <Trash2 size={15} />
                    </button>
                    <Link href={`/opportunities/${opp.id}`} style={{ flex: 1, height: 36, display: "flex", alignItems: "center", justifyContent: "center", background: C.elevated, border: `1px solid ${C.border}`, borderRadius: 8, color: C.sec, fontSize: 12, fontWeight: 700, textDecoration: "none" }}>Details</Link>
                    <a href={opp.applicationLink} target="_blank" rel="noopener noreferrer" style={{ flex: 1, height: 36, display: "flex", alignItems: "center", justifyContent: "center", gap: 4, background: C.accent, borderRadius: 8, color: "#fff", fontSize: 12, fontWeight: 700, textDecoration: "none" }}>
                      Apply <ExternalLink size={12} />
                    </a>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
