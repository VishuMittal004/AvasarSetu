"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, BookmarkPlus, BookmarkMinus, Share2, ExternalLink,
  Calendar, MapPin, CheckCircle2, XCircle, Info, FileText,
  Check, ShieldCheck, Building, AlertCircle, Sparkles,
} from "lucide-react";
import { useProfileStore } from "@/store/useProfileStore";
import { useSavedStore } from "@/store/useSavedStore";
import { OpportunityService } from "@/services/OpportunityService";
import { getCurrentTimeMs, getDeadlineDaysLeft, getOpportunityFreshness } from "@/lib/utils";
import { checkEligibility } from "@/services/EligibilityEngine";
import { Opportunity, EligibilityResult, UserProfile } from "@/types";
import { QueryParser } from "@/services/QueryParser";

/* ─── Colour palette ─── */
const C = {
  bg:          "#09090b",
  surface:     "#111113",
  elevated:    "#18181b",
  border:      "#27272a",
  borderSub:   "#1c1c1f",
  text:        "#fafafa",
  sec:         "#a1a1aa",
  muted:       "#52525b",
  disabled:    "#3f3f46",
  accent:      "#10b981",
  accentHov:   "#059669",
  accentMuted: "#064e3b",
  accentSubtle:"rgba(16,185,129,0.08)",
  accentRing:  "rgba(16,185,129,0.25)",
  danger:      "#ef4444",
  dangerSub:   "rgba(239,68,68,0.08)",
  dangerRing:  "rgba(239,68,68,0.2)",
  info:        "#3b82f6",
  infoSub:     "rgba(59,130,246,0.08)",
  infoRing:    "rgba(59,130,246,0.2)",
  warning:     "#f59e0b",
};

export default function OpportunityDetail() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const profile = useProfileStore((s) => s.profile);
  const { saved, saveOpportunity, unsaveOpportunity } = useSavedStore();

  const [opportunity, setOpportunity] = useState<Opportunity | null>(null);
  const [eligibility, setEligibility] = useState<EligibilityResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [explanation, setExplanation] = useState<string | null>(null);
  const [isExplaining, setIsExplaining] = useState(false);
  const [shareStatus, setShareStatus] = useState("");
  const [searchHints] = useState<Partial<UserProfile>>(() => {
    if (typeof window === "undefined") return {};
    const query = sessionStorage.getItem("cc-last-search-query");
    sessionStorage.removeItem("cc-last-search-query");
    return query ? QueryParser.parse(query).profileHints ?? {} : {};
  });

  const safeExternalUrl = (value: string | undefined) => {
    if (!value) return null;
    try {
      const url = new URL(value);
      return url.protocol === "https:" ? url.toString() : null;
    } catch {
      return null;
    }
  };

  useEffect(() => {
    const fetchOpp = async () => {
      setIsLoading(true);
      const opp = await OpportunityService.getOpportunityById(id);
      if (opp) {
        setOpportunity(opp);
        setEligibility(checkEligibility(opp.rules, { ...(profile ?? {}), ...searchHints }));
      }
      setIsLoading(false);
    };
    fetchOpp();
  }, [id, profile, searchHints]);

  const handleExplain = async () => {
    setIsExplaining(true);
    try {
      const text = await OpportunityService.explainOpportunity(id);
      setExplanation(text);
    } finally {
      setIsExplaining(false);
    }
  };

  const handleShare = async () => {
    setShareStatus("");
    const shareData = {
      title: opportunity?.title ?? "AvasarSetu opportunity",
      text: opportunity ? `${opportunity.title} — found on AvasarSetu` : "Explore opportunities on AvasarSetu",
      url: window.location.href,
    };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
        setShareStatus("Share sheet opened.");
      } else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareData.url);
        setShareStatus("Link copied.");
      } else {
        setShareStatus("Sharing is unavailable in this browser.");
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setShareStatus("Could not share this link. Please copy it from the address bar.");
    }
  };

  /* Loading */
  if (isLoading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "400px" }}>
        <div className="spinner" />
      </div>
    );
  }

  /* Not found */
  if (!opportunity || !eligibility) {
    return (
      <div style={{ padding: "32px", textAlign: "center", maxWidth: "420px", margin: "80px auto", background: C.surface, border: `1px solid ${C.border}`, borderRadius: "20px" }}>
        <h2 style={{ fontSize: "20px", fontWeight: 700, color: C.text, marginBottom: "8px" }}>Opportunity Not Found</h2>
        <p style={{ fontSize: "14px", color: C.muted, marginBottom: "24px" }}>This opportunity does not exist or has been removed.</p>
        <button onClick={() => router.push("/explore")} style={{ height: "40px", padding: "0 20px", background: C.accent, color: "#fff", border: "none", borderRadius: "10px", fontWeight: 700, fontSize: "14px", cursor: "pointer", fontFamily: "inherit" }}>
          Back to Explore
        </button>
      </div>
    );
  }

  const isSaved = saved.some(s => s.opportunityId === opportunity.id);
  const daysLeft = getDeadlineDaysLeft(opportunity.deadline, getCurrentTimeMs());
  const isUrgent = daysLeft !== null && daysLeft <= 7 && daysLeft >= 0;
  const isExpired = daysLeft !== null && daysLeft < 0;
  const isPresentationRecord = opportunity.isDemoRecord === true || opportunity.id.startsWith("demo-");
  const freshness = getOpportunityFreshness(
    opportunity.lastVerifiedAt,
    opportunity.type,
    undefined,
    isPresentationRecord,
  );
  const applicationUrl = safeExternalUrl(opportunity.applicationLink);
  const sourceUrl = safeExternalUrl(opportunity.source.url);

  return (
    <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "24px 24px 80px", fontFamily: "Inter, sans-serif" }}>

      {/* Back link */}
      <Link href="/explore" style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "13px", fontWeight: 600, color: C.muted, textDecoration: "none", marginBottom: "24px", transition: "color 150ms" }}>
        <ArrowLeft size={16} /> Back to Search
      </Link>

      {/* ── Hero Card ── */}
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: "20px", padding: "28px 32px", marginBottom: "24px", position: "relative", overflow: "hidden" }}>

        {/* Verified badge */}
        {opportunity.source.trustLevel === "verified" && !opportunity.isDemoRecord && (
          <div style={{ position: "absolute", top: 0, right: 0, display: "flex", alignItems: "center", gap: "6px", background: C.accentMuted, border: `1px solid ${C.accentRing}`, borderRadius: "0 20px 0 12px", padding: "6px 14px" }}>
            <ShieldCheck size={14} style={{ color: C.accent }} />
            <span style={{ fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "1px", color: C.accent }}>Verified Source</span>
          </div>
        )}

        {/* Type + deadline pills */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "16px", marginTop: "4px" }}>
          <span style={{ display: "inline-flex", alignItems: "center", padding: "3px 10px", background: C.accentSubtle, color: C.accent, fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.8px", borderRadius: "6px", border: `1px solid ${C.accentRing}` }}>
            {opportunity.type}
          </span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: "5px", padding: "3px 10px", fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.8px", borderRadius: "6px", border: "1px solid", ...(isExpired ? { background: C.dangerSub, color: C.danger, borderColor: C.dangerRing } : isUrgent ? { background: "rgba(245,158,11,0.08)", color: C.warning, borderColor: "rgba(245,158,11,0.25)" } : { background: C.elevated, color: C.muted, borderColor: C.border }) }}>
            <Calendar size={11} /> {opportunity.deadline ? `Due ${new Date(opportunity.deadline).toLocaleDateString()}` : "Deadline not listed"}
            {isExpired && " (Expired)"}
            {isUrgent && !isExpired && ` · ${daysLeft}d left`}
          </span>
        </div>

        {/* Title */}
        <h1 style={{ fontSize: "clamp(22px,3vw,32px)", fontWeight: 800, color: C.text, letterSpacing: "-0.5px", lineHeight: 1.1, marginBottom: "16px", paddingRight: "120px" }}>
          {opportunity.title}
        </h1>

        {/* Meta row */}
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "16px", fontSize: "14px", color: C.sec, marginBottom: "24px" }}>
          <span style={{ display: "flex", alignItems: "center", gap: "7px" }}>
            <Building size={15} style={{ color: C.muted }} /> {opportunity.issuingAuthority}
          </span>
          {opportunity.location && (
            <>
              <span style={{ width: "4px", height: "4px", borderRadius: "50%", background: C.disabled, flexShrink: 0 }} />
              <span style={{ display: "flex", alignItems: "center", gap: "7px" }}>
                <MapPin size={15} style={{ color: C.muted }} /> {opportunity.location}
              </span>
            </>
          )}
          {opportunity.salaryOrAmount && (
            <>
              <span style={{ width: "4px", height: "4px", borderRadius: "50%", background: C.disabled, flexShrink: 0 }} />
              <span style={{ fontWeight: 700, color: C.accent, background: C.accentSubtle, padding: "2px 10px", borderRadius: "6px", border: `1px solid ${C.accentRing}` }}>
                {opportunity.salaryOrAmount}
              </span>
            </>
          )}
        </div>

        {/* Action buttons */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
          {applicationUrl && (
            <a
              href={applicationUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{ flex: "1 1 auto", minWidth: "160px", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "8px", height: "44px", padding: "0 24px", background: C.accent, color: "#fff", fontWeight: 700, fontSize: "14px", borderRadius: "12px", textDecoration: "none", boxShadow: `0 2px 12px ${C.accentRing}`, transition: "background 150ms" }}
            >
              Open Application Link <ExternalLink size={15} style={{ opacity: 0.7 }} />
            </a>
          )}
          <button
            onClick={() => isSaved ? unsaveOpportunity(opportunity.id) : saveOpportunity(opportunity.id)}
            style={{ display: "inline-flex", alignItems: "center", gap: "8px", height: "44px", padding: "0 20px", background: isSaved ? C.accentSubtle : "transparent", color: isSaved ? C.accent : C.sec, border: `1px solid ${isSaved ? C.accentRing : C.border}`, borderRadius: "12px", fontWeight: 700, fontSize: "14px", cursor: "pointer", fontFamily: "inherit", transition: "all 150ms" }}
          >
            {isSaved ? <><BookmarkMinus size={16} /> Saved</> : <><BookmarkPlus size={16} /> Save for later</>}
          </button>
          <button aria-label="Share opportunity" onClick={handleShare} style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: "44px", height: "44px", background: "transparent", border: `1px solid ${C.border}`, borderRadius: "12px", color: C.muted, cursor: "pointer", fontFamily: "inherit", transition: "border-color 150ms" }}>
            <Share2 size={16} />
          </button>
        </div>
        {shareStatus && <p role="status" style={{ fontSize: "12px", color: C.sec, margin: "10px 0 0" }}>{shareStatus}</p>}
      </div>

      {/* ── Two-column layout ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: "24px", alignItems: "start" }}>

        {/* Left — main content */}
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>

          {/* Eligibility analysis */}
          <section style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: "16px", padding: "24px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
              <h2 style={{ fontSize: "16px", fontWeight: 700, color: C.text, margin: 0 }}>Deterministic Match Analysis</h2>
              <div style={{ display: "flex", alignItems: "center", gap: "6px", background: C.elevated, border: `1px solid ${C.border}`, padding: "4px 12px", borderRadius: "9999px" }}>
                <span style={{ fontSize: "12px", color: C.muted }}>Score:</span>
                <span style={{ fontSize: "14px", fontWeight: 800, color: eligibility.matchScore >= 70 ? C.accent : eligibility.matchScore >= 40 ? C.warning : C.danger }}>
                  {eligibility.isUnknown ? "—" : `${eligibility.matchScore}%`}
                </span>
              </div>
            </div>

            {eligibility.isUnknown && (
              <p style={{ fontSize: "13px", color: C.warning, margin: "-8px 0 16px", lineHeight: 1.5 }}>
                There is not enough profile information or recorded criteria to assess a match. Missing details are not treated as a pass.
              </p>
            )}

            {eligibility.reasons.length === 0 ? (
              <div style={{ textAlign: "center", padding: "24px", background: C.elevated, borderRadius: "12px", border: `1px dashed ${C.border}` }}>
                <p style={{ fontSize: "13px", color: C.muted }}>No normalized eligibility rules are recorded for this opportunity, so a match cannot be assessed.</p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {eligibility.reasons.map((reason, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: "flex", alignItems: "flex-start", gap: "12px", padding: "14px 16px", borderRadius: "12px", border: "1px solid",
                      ...(reason.isMatch
                        ? { background: C.accentSubtle, borderColor: C.accentRing }
                        : reason.isMissing
                          ? { background: "rgba(245,158,11,.06)", borderColor: "rgba(245,158,11,.22)" }
                          : { background: C.dangerSub, borderColor: C.dangerRing }),
                    }}
                  >
                    <div style={{ marginTop: "1px", flexShrink: 0 }}>
                      {reason.isMatch
                        ? <CheckCircle2 size={16} style={{ color: C.accent }} />
                        : reason.isMissing
                          ? <Info size={16} style={{ color: C.warning }} />
                          : <XCircle size={16} style={{ color: C.danger }} />
                      }
                    </div>
                    <div>
                      <h4 style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.6px", marginBottom: "3px", color: reason.isMatch ? C.accent : C.danger }}>
                        {reason.isMissing ? `${reason.criterion} · missing info` : reason.criterion}
                      </h4>
                      <p style={{ fontSize: "13px", color: C.sec, margin: 0, lineHeight: 1.5 }}>
                        {reason.message}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Overview */}
          <section style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: "16px", padding: "24px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
              <h2 style={{ fontSize: "16px", fontWeight: 700, color: C.text, margin: 0 }}>Overview</h2>
              <button
                onClick={handleExplain}
                disabled={isExplaining}
                style={{ display: "inline-flex", alignItems: "center", gap: "6px", height: "32px", padding: "0 12px", background: "transparent", color: C.sec, border: `1px solid ${C.border}`, borderRadius: "8px", fontSize: "12px", fontWeight: 600, cursor: "pointer", fontFamily: "inherit", opacity: isExplaining ? 0.6 : 1 }}
              >
                {isExplaining ? "Explaining…" : <><Sparkles size={14} aria-hidden="true" /> Explain Simply</>}
              </button>
            </div>

            {explanation && (
              <div style={{ display: "flex", gap: "12px", padding: "14px 16px", background: C.infoSub, border: `1px solid ${C.infoRing}`, borderRadius: "12px", marginBottom: "16px" }}>
                <Info size={16} style={{ color: C.info, flexShrink: 0, marginTop: "1px" }} />
                <p style={{ fontSize: "13px", color: C.sec, margin: 0, lineHeight: 1.6 }}>{explanation}</p>
              </div>
            )}

            <p style={{ fontSize: "14px", color: C.sec, lineHeight: 1.7, margin: 0 }}>
              {opportunity.description}
            </p>
          </section>

          {/* How to Apply */}
          {opportunity.applicationSteps.length > 0 && (
            <section style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: "16px", padding: "24px" }}>
              <h2 style={{ fontSize: "16px", fontWeight: 700, color: C.text, margin: "0 0 24px" }}>How to Apply</h2>
              <div style={{ display: "flex", flexDirection: "column", gap: "0" }}>
                {opportunity.applicationSteps.map((step, idx) => (
                  <div key={idx} style={{ display: "flex", gap: "16px" }}>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "32px", height: "32px", borderRadius: "50%", background: C.elevated, border: `1px solid ${C.border}`, color: C.text, fontWeight: 700, fontSize: "13px", flexShrink: 0 }}>
                        {idx + 1}
                      </div>
                      {idx < opportunity.applicationSteps.length - 1 && (
                        <div style={{ width: "1px", flex: 1, background: C.border, margin: "4px 0" }} />
                      )}
                    </div>
                    <div style={{ paddingBottom: idx < opportunity.applicationSteps.length - 1 ? "24px" : "0", paddingTop: "5px" }}>
                      <p style={{ fontSize: "14px", color: C.sec, lineHeight: 1.6, margin: 0 }}>{step}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* Right — sidebar */}
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>

          {/* Document checklist */}
          <section style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: "16px", padding: "20px" }}>
            <h3 style={{ fontSize: "14px", fontWeight: 700, color: C.text, display: "flex", alignItems: "center", gap: "8px", margin: "0 0 16px" }}>
              <FileText size={15} style={{ color: C.accent }} /> Document Checklist
            </h3>
            {opportunity.requiredDocuments.length > 0 ? (
              <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "8px" }}>
                {opportunity.requiredDocuments.map((doc) => (
                  <li key={doc.id} style={{ display: "flex", alignItems: "flex-start", gap: "10px", fontSize: "13px", color: C.sec, background: C.elevated, padding: "10px 12px", borderRadius: "10px", border: `1px solid ${C.border}` }}>
                    <Check size={14} style={{ color: C.accent, flexShrink: 0, marginTop: "1px" }} />
                    <span style={{ lineHeight: 1.4 }}>
                      {doc.name}
                      {doc.required
                        ? <span style={{ color: C.danger, marginLeft: "4px" }}>*</span>
                        : <span style={{ color: C.muted, marginLeft: "6px", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.5px" }}>(Optional)</span>
                      }
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p style={{ fontSize: "13px", color: C.muted, fontStyle: "italic" }}>No specific documents listed.</p>
            )}
          </section>

          {/* Trust / disclaimer */}
          <section style={{ background: C.elevated, border: `1px solid ${C.border}`, borderRadius: "16px", padding: "20px" }}>
            <div style={{ display: "flex", gap: "10px", fontSize: "12px", color: C.muted, lineHeight: 1.6 }}>
              <AlertCircle size={16} style={{ flexShrink: 0, color: C.muted, marginTop: "1px" }} />
              <p style={{ margin: 0 }}>
                AvasarSetu helps you discover opportunities from publicly available information. We are not a government entity. Always verify details on the official source before applying.
              </p>
            </div>
            <div style={{ marginTop: "16px", paddingTop: "16px", borderTop: `1px solid ${C.border}` }}>
              {sourceUrl && <a
                href={sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "12px", fontWeight: 700, color: C.sec, textDecoration: "none", transition: "color 150ms" }}
              >
                View Source Listing <ExternalLink size={13} style={{ opacity: 0.6 }} />
              </a>}
              <p style={{ fontSize: "11px", color: C.disabled, marginTop: "6px", fontWeight: 500 }}>
                {freshness.isStale ? `May be outdated · ${freshness.label}` : freshness.label}
              </p>
              {!isPresentationRecord && freshness.isStale && <p role="status" style={{ fontSize: "11px", color: C.warning, marginTop: "4px" }}>Confirm the current deadline and eligibility on the linked source before applying.</p>}
            </div>
          </section>
        </div>
      </div>

      {/* Mobile: collapse sidebar below content on small screens via media query in globals.css */}
      <style>{`
        @media (max-width: 768px) {
          .opp-detail-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}
