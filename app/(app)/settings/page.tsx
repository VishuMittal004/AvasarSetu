"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { Settings, Shield, Bell, Key, Trash2, Smartphone, Moon, Sun, Globe, LogOut, CheckCircle2 } from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";
import { useProfileStore } from "@/store/useProfileStore";
import { useSavedStore } from "@/store/useSavedStore";
import { useDocumentStore } from "@/store/useDocumentStore";
import { useNotificationStore } from "@/store/useNotificationStore";
import { usePreferencesStore } from "@/store/usePreferencesStore";

const C = {
  bg: "#09090b", surface: "#111113", elevated: "#18181b",
  border: "#27272a", text: "#fafafa", sec: "#a1a1aa", muted: "#52525b",
  accent: "#10b981", danger: "#ef4444",
};

const subscribeHydration = (_onStoreChange: () => void) => () => {};
const getClientHydration = () => true;
const getServerHydration = () => false;

export default function SettingsPage() {
  const router = useRouter();
  const { logout, userEmail, authProvider } = useAuthStore();
  const { clearProfile } = useProfileStore();
  const { clearAll: clearSaved } = useSavedStore();
  const { clearAll: clearDocs } = useDocumentStore();
  const { clearAll: clearNotifs } = useNotificationStore();
  const lowDataMode = usePreferencesStore(state => state.lowDataMode);
  const setLowDataMode = usePreferencesStore(state => state.setLowDataMode);

  const [isClearing, setIsClearing] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [accountDeleteError, setAccountDeleteError] = useState("");
  const [pushStatus, setPushStatus] = useState<"idle" | "requesting" | "disabling" | "granted" | "denied" | "error">("idle");
  const [pushMessage, setPushMessage] = useState("");
  const mounted = useSyncExternalStore(subscribeHydration, getClientHydration, getServerHydration);

  const clearQueuedSearches = () => {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.controller?.postMessage({ type: "CLEAR_QUEUED_SEARCHES" });
    void navigator.serviceWorker.ready.then(registration => registration.active?.postMessage({ type: "CLEAR_QUEUED_SEARCHES" })).catch(() => {});
  };

  useEffect(() => {
    if (!("serviceWorker" in navigator) || !("Notification" in window)) return;
    if (authProvider !== "supabase") return;
    void navigator.serviceWorker.ready.then(async registration => {
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) setPushStatus("granted");
    }).catch(() => {});
  }, [authProvider]);

  const handleClearData = async () => {
    if (confirm("Clear all local data? This resets your profile, saved items, document checklist, and notifications. Cannot be undone.")) {
      setIsClearing(true);
      try {
        clearProfile(); clearSaved(); clearNotifs(); setLowDataMode(false);
        await clearDocs();
        clearQueuedSearches();
        localStorage.clear();
        router.push("/");
      } finally {
        setIsClearing(false);
      }
    }
  };

  const handleEnablePush = async () => {
    if (!("Notification" in window) || !("serviceWorker" in navigator) || !("PushManager" in window)) { setPushStatus("error"); return; }
    if (authProvider !== "supabase") { setPushMessage("Sign in with an account to save this device for deadline alerts."); setPushStatus("error"); return; }
    setPushStatus("requesting");
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") { setPushStatus("denied"); return; }
      const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!publicKey) throw new Error("Push is not configured on this deployment.");
      const applicationServerKey = Uint8Array.from(atob(publicKey.replace(/-/g, "+").replace(/_/g, "/")), character => character.charCodeAt(0));
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription() ??
        await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey });
      const response = await fetch("/api/notifications/push", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(subscription.toJSON()),
      });
      if (!response.ok) throw new Error("Could not save this device subscription.");
      setPushMessage("");
      setPushStatus("granted");
    } catch (error) { setPushMessage(error instanceof Error ? error.message : "Could not enable push notifications."); setPushStatus("error"); }
  };

  const handleDisablePush = async () => {
    setPushStatus("disabling");
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        const response = await fetch("/api/notifications/push", {
          method: "DELETE", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        });
        if (!response.ok) throw new Error("Could not remove this device from your account.");
        await subscription.unsubscribe();
      }
      setPushStatus("idle");
      setPushMessage("");
    } catch (error) {
      setPushMessage(error instanceof Error ? error.message : "Could not disable push notifications.");
      setPushStatus("error");
    }
  };

  const handleLogout = async () => {
    if (authProvider === "supabase") {
      clearProfile(); clearSaved(); clearNotifs(); await clearDocs();
    }
    await logout();
    router.push("/login");
  };

  const handleDeleteAccount = async () => {
    if (!confirm("Permanently delete your account and server-side profile, saved items, and notifications? Local checklist and app data on this device will also be cleared. This cannot be undone.")) return;
    setAccountDeleteError("");
    setIsDeletingAccount(true);
    try {
      try {
        const registration = await navigator.serviceWorker?.ready;
        const subscription = await registration?.pushManager.getSubscription();
        await subscription?.unsubscribe();
      } catch { /* continue server-side deletion if local push cleanup fails */ }
      const response = await fetch("/api/profile", { method: "DELETE" });
      if (!response.ok) throw new Error("Account deletion failed");
      clearProfile(); clearSaved(); await clearDocs(); clearNotifs();
      setLowDataMode(false);
      clearQueuedSearches();
      localStorage.clear();
      await logout();
      router.replace("/");
    } catch {
      setAccountDeleteError("We could not delete your account. Try again or contact support.");
    } finally {
      setIsDeletingAccount(false);
    }
  };

  const sectionCard: React.CSSProperties = { background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, overflow: "hidden", marginBottom: 16 };
  const sectionHead: React.CSSProperties = { padding: "14px 20px", background: C.elevated, borderBottom: `1px solid ${C.border}`, fontSize: 13, fontWeight: 700, color: C.sec };
  const row: React.CSSProperties = { padding: "14px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: `1px solid ${C.border}` };
  const ghostBtn: React.CSSProperties = { background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", fontSize: 12, fontWeight: 700, color: C.accent, padding: "6px 12px", borderRadius: 8 };
  const primaryBtn: React.CSSProperties = { display: "inline-flex", alignItems: "center", gap: 6, padding: "0 20px", height: 40, background: C.accent, color: "#fff", border: "none", borderRadius: 10, fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "inherit" };
  const dangerBtn: React.CSSProperties = { ...primaryBtn, background: C.danger };
  const outBtn: React.CSSProperties = { ...primaryBtn, background: "transparent", border: `1px solid ${C.border}`, color: C.sec };

  const SETTINGS_SECTIONS = [
    {
      title: "Account Preferences",
      items: [
        { icon: Globe, label: "Language", value: "English (currently the only language)" },
        { icon: mounted ? Moon : Sun, label: "Appearance", value: "Dark" },
      ]
    },
    {
      title: "Privacy & Security",
      items: [
        { icon: Key, label: "Password", value: "Reset by email", actionLabel: "Open sign in", action: () => router.push("/login") },
        { icon: Smartphone, label: "Two-Factor Authentication", value: "Not available" },
      ]
    },
  ];

  if (!mounted) return null;

  return (
    <div style={{ padding: "32px 24px", maxWidth: 820, margin: "0 auto", fontFamily: "inherit" }}>
      {/* Header */}
      <header style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: C.text, letterSpacing: "-0.5px", display: "flex", alignItems: "center", gap: 10 }}>
          <Settings size={24} color={C.accent} /> Settings
        </h1>
        <p style={{ fontSize: 14, color: C.muted, marginTop: 4 }}>Manage your account and preferences.</p>
      </header>

      {/* Account card */}
      <div style={{ ...sectionCard, marginBottom: 20 }}>
        <div style={{ padding: 24, display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ width: 60, height: 60, borderRadius: "50%", background: C.accent, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, fontWeight: 700, color: "#fff", flexShrink: 0 }}>
            {userEmail?.[0]?.toUpperCase() || "U"}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: C.text }}>{userEmail || "Demo User"}</div>
            <div style={{ fontSize: 13, color: C.muted, marginTop: 2 }}>{authProvider === "supabase" ? "AvasarSetu Account" : "AvasarSetu Demo Account"}</div>
          </div>
          <button onClick={handleLogout} style={outBtn}><LogOut size={14} /> Log out</button>
        </div>
      </div>

      {/* General settings */}
      {SETTINGS_SECTIONS.map((section, idx) => (
        <div key={idx} style={sectionCard}>
          <div style={sectionHead}>{section.title}</div>
          {section.items.map((item, i) => (
            <div key={i} style={{ ...row, borderBottom: i < section.items.length - 1 ? `1px solid ${C.border}` : "none" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <item.icon size={16} color={C.muted} />
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: C.text }}>{item.label}</div>
                  <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>{item.value}</div>
                </div>
              </div>
              {item.action && <button style={ghostBtn} onClick={item.action}>{item.actionLabel}</button>}
            </div>
          ))}
        </div>
      ))}

      {/* Push Notifications */}
      <div style={sectionCard}>
        <div style={sectionHead}>Data & Accessibility</div>
        <div style={{ ...row, borderBottom: "none" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <Globe size={16} color={C.muted} />
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: C.text }}>Low-data mode</div>
              <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>Loads fewer listings and shorter descriptions on this device.</div>
            </div>
          </div>
          <button type="button" role="switch" aria-checked={lowDataMode} onClick={() => setLowDataMode(!lowDataMode)}
            style={{ width: 48, height: 28, border: 0, borderRadius: 999, padding: 3, background: lowDataMode ? C.accent : C.muted, cursor: "pointer", transition: "background 150ms" }}>
            <span style={{ display: "block", width: 22, height: 22, borderRadius: "50%", background: "white", transform: lowDataMode ? "translateX(20px)" : "translateX(0)", transition: "transform 150ms" }} />
          </button>
        </div>
      </div>

      {/* Push Notifications */}
      <div style={sectionCard}>
        <div style={sectionHead}><Bell size={16} aria-hidden="true" /> Push Notifications</div>
        <div style={{ padding: 20 }}>
          <p style={{ fontSize: 13, color: C.muted, marginBottom: 16, lineHeight: 1.6 }}>
            Enable browser push notifications to receive reminders for saved opportunities with upcoming deadlines.
          </p>
          <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
            {pushStatus === "granted" || pushStatus === "disabling" ? (
              <button onClick={handleDisablePush} disabled={pushStatus === "disabling"} style={outBtn}><Bell size={14} /> {pushStatus === "disabling" ? "Disabling..." : "Disable on this device"}</button>
            ) : (
              <button onClick={handleEnablePush} disabled={pushStatus === "requesting"} style={primaryBtn}>
                <Bell size={14} /> {pushStatus === "requesting" ? "Updating..." : "Enable Push Notifications"}
              </button>
            )}
            {pushStatus === "denied" && <p style={{ fontSize: 13, color: C.danger }}>Permission denied. Enable in browser settings.</p>}
            {pushStatus === "error"  && <p style={{ fontSize: 13, color: C.danger }}>{pushMessage || "Push not supported in this browser."}</p>}
            {pushStatus === "granted" && <p style={{ fontSize: 13, color: C.accent, display: "flex", alignItems: "center", gap: 4 }}><CheckCircle2 size={14} /> You&apos;ll receive push notifications.</p>}
          </div>
        </div>
      </div>

      {/* Danger Zone */}
      <div style={{ ...sectionCard, border: "1px solid rgba(239,68,68,0.3)" }}>
        <div style={{ ...sectionHead, background: "rgba(239,68,68,0.06)", borderBottomColor: "rgba(239,68,68,0.2)", color: C.danger }}>Danger Zone</div>
        <div style={{ padding: 20 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: C.text, marginBottom: 6 }}>Clear All Local Data</div>
    <p style={{ fontSize: 13, color: C.muted, lineHeight: 1.6, marginBottom: 16 }}>
            Permanently deletes all locally stored data — profile, saved items, documents, and notifications — and redirects to home. Cannot be undone.
          </p>
          <button onClick={handleClearData} disabled={isClearing} style={{ ...dangerBtn, opacity: isClearing ? 0.6 : 1 }}>
            <Trash2 size={14} /> {isClearing ? "Clearing..." : "Clear All Local Data"}
          </button>
          {authProvider === "supabase" && (
            <div style={{ marginTop: 24, paddingTop: 20, borderTop: `1px solid ${C.border}` }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: C.text, marginBottom: 6 }}>Delete Account</div>
              <p style={{ fontSize: 13, color: C.muted, lineHeight: 1.6, marginBottom: 16 }}>
                Permanently delete your account and associated server-side profile, saved items, and notifications. Local device data will be cleared too.
              </p>
              {accountDeleteError && <p role="alert" style={{ fontSize: 13, color: C.danger, marginBottom: 12 }}>{accountDeleteError}</p>}
              <button onClick={handleDeleteAccount} disabled={isDeletingAccount} style={{ ...dangerBtn, opacity: isDeletingAccount ? 0.6 : 1 }}>
                <Trash2 size={14} /> {isDeletingAccount ? "Deleting account..." : "Delete Account and Data"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
