"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Calendar as CalendarIcon, Clock, ChevronRight, CalendarClock } from "lucide-react";
import { useSavedStore } from "@/store/useSavedStore";
import { OpportunityService } from "@/services/OpportunityService";
import { Opportunity } from "@/types";

export default function CalendarPage() {
  const { saved } = useSavedStore();
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchSaved = async () => {
      setIsLoading(true);
      const fetched: Opportunity[] = [];
      for (const item of saved) {
        const opp = await OpportunityService.getOpportunityById(item.opportunityId);
        if (opp) fetched.push(opp);
      }
      const withDeadlines = fetched.filter((opportunity) => opportunity.deadline);
      withDeadlines.sort((a, b) => new Date(a.deadline!).getTime() - new Date(b.deadline!).getTime());
      setOpportunities(withDeadlines);
      setIsLoading(false);
    };
    fetchSaved();
  }, [saved]);

  const groupedOpportunities = opportunities.reduce((acc, opp) => {
    if (!opp.deadline) return acc;
    const date = new Date(opp.deadline);
    const monthYear = date.toLocaleString("default", { month: "long", year: "numeric" });
    if (!acc[monthYear]) acc[monthYear] = [];
    acc[monthYear].push(opp);
    return acc;
  }, {} as Record<string, Opportunity[]>);

  return (
    <div style={{ padding: "24px", maxWidth: "900px", margin: "0 auto", fontFamily: "Inter, sans-serif", paddingBottom: "80px" }}>

      {/* Header */}
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-end", justifyContent: "space-between", gap: "16px", marginBottom: "32px" }}>
        <div>
          <h1 style={{ fontSize: "26px", fontWeight: 800, color: "#fafafa", letterSpacing: "-0.5px", display: "flex", alignItems: "center", gap: "12px", margin: 0 }}>
            <CalendarClock size={26} style={{ color: "#10b981" }} />
            Deadline Calendar
          </h1>
          <p style={{ color: "#52525b", marginTop: "8px", fontSize: "14px", fontWeight: 500 }}>
            Keep track of important dates for your saved opportunities so you never miss a deadline.
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "8px", background: "#18181b", border: "1px solid #27272a", borderRadius: "8px", padding: "6px 12px" }}>
          <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#f59e0b" }} />
          <span style={{ fontSize: "11px", fontWeight: 700, color: "#a1a1aa", textTransform: "uppercase", letterSpacing: "1px" }}>
            Urgent (&lt; 7 Days)
          </span>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: "80px 0" }}>
          <div className="spinner" />
        </div>
      ) : opportunities.length === 0 ? (
        <div style={{ textAlign: "center", padding: "64px 24px", background: "#111113", border: "1px dashed #27272a", borderRadius: "20px" }}>
          <CalendarIcon size={40} style={{ color: "#3f3f46", margin: "0 auto 16px" }} />
          <h3 style={{ fontSize: "18px", fontWeight: 700, color: "#fafafa", marginBottom: "8px" }}>No upcoming deadlines</h3>
          <p style={{ fontSize: "14px", color: "#52525b", marginBottom: "24px" }}>Save opportunities to track their deadlines here.</p>
          <Link
            href="/explore"
            style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", padding: "0 24px", height: "40px", background: "#10b981", color: "#fff", fontWeight: 700, fontSize: "13px", borderRadius: "10px", textDecoration: "none", transition: "background 150ms" }}
          >
            Explore Opportunities
          </Link>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "40px" }}>
          {Object.entries(groupedOpportunities).map(([monthYear, opps]) => (
            <div key={monthYear}>
              {/* Month heading */}
              <div style={{ position: "sticky", top: 0, background: "rgba(9,9,11,0.95)", backdropFilter: "blur(8px)", padding: "12px 0", zIndex: 10, borderBottom: "1px solid #27272a", marginBottom: "16px" }}>
                <h2 style={{ fontSize: "12px", fontWeight: 800, color: "#a1a1aa", textTransform: "uppercase", letterSpacing: "2px", display: "flex", alignItems: "center", gap: "8px", margin: 0 }}>
                  <CalendarIcon size={14} style={{ color: "#52525b" }} />
                  {monthYear}
                </h2>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {opps.map((opp) => {
                  if (!opp.deadline) return null;
                  const deadline = new Date(opp.deadline);
                  const msLeft = deadline.getTime() - Date.now();
                  const isUrgent = msLeft < 7 * 24 * 60 * 60 * 1000;
                  const isExpired = msLeft < 0;

                  const cardBorder = isExpired ? "#7f1d1d" : isUrgent ? "#92400e" : "#27272a";
                  const cardBg = isExpired ? "rgba(239,68,68,0.05)" : isUrgent ? "rgba(245,158,11,0.05)" : "#111113";
                  const dateBg = isExpired ? "rgba(239,68,68,0.1)" : isUrgent ? "rgba(245,158,11,0.1)" : "#18181b";
                  const dateBorder = isExpired ? "rgba(239,68,68,0.3)" : isUrgent ? "rgba(245,158,11,0.3)" : "#27272a";
                  const monthColor = isExpired ? "#ef4444" : isUrgent ? "#f59e0b" : "#52525b";
                  const dayColor = isExpired ? "#ef4444" : isUrgent ? "#f59e0b" : "#fafafa";

                  return (
                    <Link
                      key={opp.id}
                      href={`/opportunities/${opp.id}`}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "16px",
                        background: cardBg,
                        border: `1px solid ${cardBorder}`,
                        borderRadius: "14px",
                        padding: "16px",
                        textDecoration: "none",
                        color: "inherit",
                        transition: "border-color 150ms, box-shadow 150ms",
                      }}
                    >
                      {/* Date block */}
                      <div style={{ flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", width: "60px", height: "60px", borderRadius: "12px", background: dateBg, border: `1px solid ${dateBorder}` }}>
                        <span style={{ fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "1px", color: monthColor }}>
                          {deadline.toLocaleString("default", { month: "short" })}
                        </span>
                        <span style={{ fontSize: "24px", fontWeight: 900, lineHeight: 1, color: dayColor }}>
                          {deadline.getDate()}
                        </span>
                      </div>

                      {/* Info */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                          <span style={{ fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "1px", color: "#10b981", background: "rgba(16,185,129,0.1)", padding: "2px 8px", borderRadius: "4px", border: "1px solid rgba(16,185,129,0.2)" }}>
                            {opp.type}
                          </span>
                          {isUrgent && !isExpired && (
                            <span style={{ fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "1px", color: "#f59e0b", background: "rgba(245,158,11,0.1)", padding: "2px 8px", borderRadius: "4px", border: "1px solid rgba(245,158,11,0.3)", display: "flex", alignItems: "center", gap: "4px" }}>
                              <Clock size={10} /> Action Needed
                            </span>
                          )}
                          {isExpired && (
                            <span style={{ fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "1px", color: "#ef4444", background: "rgba(239,68,68,0.1)", padding: "2px 8px", borderRadius: "4px", border: "1px solid rgba(239,68,68,0.3)" }}>
                              Expired
                            </span>
                          )}
                        </div>
                        <h3 style={{ fontSize: "15px", fontWeight: 700, color: "#fafafa", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {opp.title}
                        </h3>
                        <p style={{ fontSize: "13px", color: "#52525b", margin: "2px 0 0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {opp.issuingAuthority}
                        </p>
                      </div>

                      <ChevronRight size={18} style={{ color: "#3f3f46", flexShrink: 0 }} />
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
