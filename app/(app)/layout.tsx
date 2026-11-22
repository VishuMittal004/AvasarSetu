"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Shell } from "@/components/layout/Shell";
import { useAuthStore } from "@/store/useAuthStore";
import { createClient as createSupabaseClient } from "@/lib/supabase/client";
import { useProfileStore } from "@/store/useProfileStore";
import { useSavedStore } from "@/store/useSavedStore";
import type { UserProfile } from "@/types";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const authProvider = useAuthStore((state) => state.authProvider);
  const login = useAuthStore((state) => state.login);
  const logout = useAuthStore((state) => state.logout);
  const updateProfile = useProfileStore((state) => state.updateProfile);
  const [authChecked, setAuthChecked] = useState(false);
  const [migrationCandidate, setMigrationCandidate] = useState<Partial<UserProfile> | null>(null);
  const [migrationBusy, setMigrationBusy] = useState(false);
  const [migrationError, setMigrationError] = useState("");

  useEffect(() => {
    let active = true;
    const supabaseConfigured = Boolean(
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
      !process.env.NEXT_PUBLIC_SUPABASE_URL.includes("your-project") &&
      !process.env.NEXT_PUBLIC_SUPABASE_URL.includes("placeholder")
    );

    if (supabaseConfigured && authProvider === "demo" && isAuthenticated) {
      queueMicrotask(() => setAuthChecked(true));
    } else if (supabaseConfigured) {
      createSupabaseClient().auth.getUser().then((result: { data: { user: { email?: string | null } | null } }) => {
        const { data } = result;
        if (!active) return;
        if (data.user) {
          login(data.user.email ?? "", "supabase");
          fetch("/api/profile").then(response => response.ok ? response.json() : null).then(result => {
            if (!active) return;
            if (result?.profile) {
              updateProfile(result.profile);
            } else if (!result?.profile) {
              const localProfile = useProfileStore.getState().profile;
              const hasLocalData = localProfile && Object.values(localProfile).some(value => value !== undefined && value !== null && value !== "");
              if (hasLocalData) setMigrationCandidate(localProfile);
            }
          }).catch(() => {});
          void useSavedStore.getState().syncFromServer();
        }
        else void logout();
        setAuthChecked(true);
      }).catch(() => {
        if (!active) return;
        void logout();
        setAuthChecked(true);
      });
    } else {
      queueMicrotask(() => setAuthChecked(true));
    }
    return () => { active = false; };
  }, [authProvider, isAuthenticated, login, logout, updateProfile]);

  useEffect(() => {
    if (authChecked && !isAuthenticated) router.replace("/login");
  }, [authChecked, isAuthenticated, router]);

  if (!authChecked || !isAuthenticated) {
    return null; 
  }

  const migrateLocalProfile = async () => {
    if (!migrationCandidate) return;
    setMigrationBusy(true);
    setMigrationError("");
    try {
      const response = await fetch("/api/profile", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(migrationCandidate),
      });
      if (!response.ok) throw new Error("Could not sync the profile. Try again from your Profile page.");
      setMigrationCandidate(null);
    } catch (error) {
      setMigrationError(error instanceof Error ? error.message : "Could not sync the profile.");
    } finally {
      setMigrationBusy(false);
    }
  };

  return (
    <Shell>
      {children}
      {migrationCandidate && (
        <div role="presentation" style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(0,0,0,.72)", display: "grid", placeItems: "center", padding: 20 }}>
          <section role="dialog" aria-modal="true" aria-labelledby="profile-migration-title" style={{ width: "min(100%, 480px)", padding: 24, background: "#111113", border: "1px solid #27272a", borderRadius: 16, color: "#fafafa", boxShadow: "0 24px 80px rgba(0,0,0,.5)" }}>
            <h2 id="profile-migration-title" style={{ fontSize: 18, fontWeight: 800, margin: "0 0 10px" }}>Sync your saved profile?</h2>
            <p style={{ fontSize: 13, lineHeight: 1.6, color: "#a1a1aa", margin: "0 0 18px" }}>
              Your guest profile may include your date of birth, income, category, education, and location. Syncing stores supported fields in your account for personalized matching. AvasarSetu will not sync dependent profiles or document numbers.
            </p>
            {migrationError && <p role="alert" style={{ color: "#f87171", fontSize: 12, marginBottom: 14 }}>{migrationError}</p>}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, flexWrap: "wrap" }}>
              <button onClick={() => setMigrationCandidate(null)} disabled={migrationBusy} style={{ background: "transparent", border: "1px solid #3f3f46", color: "#d4d4d8", borderRadius: 9, height: 40, padding: "0 14px", fontWeight: 700, cursor: "pointer" }}>Keep on this device</button>
              <button onClick={() => void migrateLocalProfile()} disabled={migrationBusy} style={{ background: "#10b981", border: 0, color: "white", borderRadius: 9, height: 40, padding: "0 14px", fontWeight: 700, cursor: "pointer" }}>{migrationBusy ? "Syncing..." : "Sync to my account"}</button>
            </div>
          </section>
        </div>
      )}
    </Shell>
  );
}
