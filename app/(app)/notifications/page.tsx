"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bell, CheckCircle2, AlertCircle, Info, Trash2, CheckCheck, ExternalLink } from "lucide-react";
import { useNotificationStore } from "@/store/useNotificationStore";
import { useSavedStore } from "@/store/useSavedStore";
import { OpportunityService } from "@/services/OpportunityService";
import { Opportunity } from "@/types";
import { getCurrentTimeMs } from "@/lib/utils";

const C = {
  bg: "#09090b", surface: "#111113", elevated: "#18181b",
  border: "#27272a", text: "#fafafa", sec: "#a1a1aa", muted: "#52525b",
  accent: "#10b981", danger: "#ef4444", warning: "#f59e0b", info: "#3b82f6",
};

export default function NotificationsPage() {
  const { notifications, markAsRead, markAllAsRead, removeNotification, clearAll, generateDeadlineNotifications } = useNotificationStore();
  const { saved } = useSavedStore();
  const syncFromServer = useNotificationStore((state) => state.syncFromServer);
  const [savedOpportunities, setSavedOpportunities] = useState<Opportunity[]>([]);
  const savedIds = JSON.stringify(saved.map((item) => item.opportunityId));

  useEffect(() => {
    let cancelled = false;
    Promise.all((JSON.parse(savedIds) as string[]).map((id) => OpportunityService.getOpportunityById(id)))
      .then((items) => {
        if (cancelled) return;
        const opportunities = items.filter((item): item is Opportunity => Boolean(item));
        setSavedOpportunities(opportunities);
        generateDeadlineNotifications(opportunities);
      })
      .catch(() => {
        if (!cancelled) setSavedOpportunities([]);
      });
    return () => { cancelled = true; };
  }, [savedIds, generateDeadlineNotifications]);

  useEffect(() => { void syncFromServer(); }, [syncFromServer]);

  const dynamicAlerts = savedOpportunities
    .map(opp => {
      if (!opp?.deadline) return null;
      const daysLeft = Math.ceil((new Date(opp.deadline).getTime() - getCurrentTimeMs()) / 86400000);
      if (daysLeft <= 0 || daysLeft > 14) return null;
      return { opp, daysLeft };
    })
    .filter(Boolean) as { opp: Opportunity; daysLeft: number }[];

  const getIcon = (type: string) => {
    if (type === "deadline") return <AlertCircle size={18} color={C.warning} />;
    if (type === "match")    return <CheckCircle2 size={18} color={C.accent} />;
    if (type === "system")   return <Info size={18} color={C.info} />;
    return <Bell size={18} color={C.muted} />;
  };

  const card: React.CSSProperties = { background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: 20, display: "flex", gap: 14, marginBottom: 10 };
  const sectionLabel: React.CSSProperties = { fontSize: 10, fontWeight: 700, letterSpacing: "1px", textTransform: "uppercase", color: C.muted, marginBottom: 12 };

  return (
    <div style={{ padding: "32px 24px", maxWidth: 820, margin: "0 auto", fontFamily: "inherit" }}>
      {/* Header */}
      <header style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 32 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: C.text, letterSpacing: "-0.5px", display: "flex", alignItems: "center", gap: 10 }}>
            <Bell size={24} color={C.accent} /> Notifications
          </h1>
          <p style={{ fontSize: 14, color: C.muted, marginTop: 4, fontWeight: 500 }}>Updates on your matches and deadlines.</p>
        </div>
        {notifications.length > 0 && (
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={markAllAsRead} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", background: C.elevated, border: `1px solid ${C.border}`, borderRadius: 8, color: C.sec, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
              <CheckCheck size={14} /> Mark all read
            </button>
            <button onClick={clearAll} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 8, color: C.danger, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
              <Trash2 size={14} /> Clear all
            </button>
          </div>
        )}
      </header>

      {/* Deadline alerts */}
      {dynamicAlerts.length > 0 && (
        <div style={{ marginBottom: 28 }}>
          <div style={sectionLabel}>Deadline Alerts</div>
          {dynamicAlerts.map(({ opp, daysLeft }) => (
            <div key={`alert-${opp.id}`} style={{ ...card, background: "rgba(245,158,11,0.06)", borderColor: "rgba(245,158,11,0.2)" }}>
              <div style={{ flexShrink: 0, marginTop: 2 }}><AlertCircle size={18} color={C.warning} /></div>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                  <h3 style={{ fontSize: 14, fontWeight: 700, color: "#fcd34d" }}>{opp.title}</h3>
                  <span style={{ fontSize: 11, fontWeight: 700, color: C.warning, background: "rgba(245,158,11,0.15)", padding: "2px 8px", borderRadius: 999 }}>
                    {daysLeft}d left
                  </span>
                </div>
                <p style={{ fontSize: 13, color: "#fbbf24", lineHeight: 1.5 }}>Closes in {daysLeft} day{daysLeft === 1 ? "" : "s"}. Do not miss your chance!</p>
                <Link href={`/opportunities/${opp.id}`} style={{ display: "inline-flex", alignItems: "center", gap: 4, marginTop: 6, fontSize: 12, fontWeight: 700, color: C.warning, textDecoration: "none" }}>
                  View <ExternalLink size={11} />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Store notifications */}
      {notifications.length === 0 && dynamicAlerts.length === 0 ? (
        <div style={{ textAlign: "center", padding: "48px 24px", background: C.surface, border: `1px dashed ${C.border}`, borderRadius: 20 }}>
          <Bell size={40} color={C.muted} style={{ margin: "0 auto 16px" }} />
          <h3 style={{ fontSize: 18, fontWeight: 700, color: C.text, marginBottom: 8 }}>You&apos;re all caught up</h3>
          <p style={{ fontSize: 14, color: C.muted, marginBottom: 20 }}>No new notifications. Save opportunities to track their deadlines.</p>
          <Link href="/explore" style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 700, color: C.accent, textDecoration: "none" }}>
            Explore Opportunities <ExternalLink size={14} />
          </Link>
        </div>
      ) : notifications.length > 0 ? (
        <div>
          {dynamicAlerts.length > 0 && <div style={sectionLabel}>All Notifications</div>}
          {notifications.map(notif => (
            <div key={notif.id} style={{ ...card, borderColor: !notif.isRead ? C.accent : C.border, background: !notif.isRead ? "rgba(16,185,129,0.04)" : C.surface }}>
              <div style={{ flexShrink: 0, marginTop: 2 }}>{getIcon(notif.type)}</div>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
                  <h3 style={{ fontSize: 14, fontWeight: 700, color: !notif.isRead ? C.text : C.sec }}>{notif.title.replace(/^\u23f0\s*/, "")}</h3>
                  <span style={{ fontSize: 11, color: C.muted }}>{new Date(notif.createdAt).toLocaleDateString()}</span>
                </div>
                <p style={{ fontSize: 13, color: !notif.isRead ? C.sec : C.muted, lineHeight: 1.5 }}>{notif.message}</p>
                {notif.link && (
                  <Link href={notif.link} style={{ display: "inline-flex", alignItems: "center", gap: 4, marginTop: 4, fontSize: 12, fontWeight: 700, color: C.accent, textDecoration: "none" }}>
                    View <ExternalLink size={11} />
                  </Link>
                )}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6, paddingLeft: 12, borderLeft: `1px solid ${C.border}`, justifyContent: "center" }}>
                {!notif.isRead && (
                  <button onClick={() => markAsRead(notif.id)} title="Mark as read" style={{ width: 32, height: 32, background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: C.muted, borderRadius: 6 }}
                    onMouseEnter={e => { e.currentTarget.style.color = C.accent; e.currentTarget.style.background = "rgba(16,185,129,0.08)"; }}
                    onMouseLeave={e => { e.currentTarget.style.color = C.muted; e.currentTarget.style.background = "none"; }}>
                    <CheckCircle2 size={18} />
                  </button>
                )}
                <button onClick={() => removeNotification(notif.id)} title="Delete" style={{ width: 32, height: 32, background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: C.muted, borderRadius: 6 }}
                  onMouseEnter={e => { e.currentTarget.style.color = C.danger; e.currentTarget.style.background = "rgba(239,68,68,0.08)"; }}
                  onMouseLeave={e => { e.currentTarget.style.color = C.muted; e.currentTarget.style.background = "none"; }}>
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
