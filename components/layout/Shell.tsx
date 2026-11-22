"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Compass, Home, Search, Bookmark, Calendar, FileText, Bell, Settings, User as UserIcon, LogOut } from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";
import { useProfileStore } from "@/store/useProfileStore";
import { useSavedStore } from "@/store/useSavedStore";
import { useDocumentStore } from "@/store/useDocumentStore";
import { useNotificationStore } from "@/store/useNotificationStore";

const NAV_ITEMS = [
  { name: "Dashboard", href: "/dashboard", icon: Home },
  { name: "Explore", href: "/explore", icon: Search },
  { name: "My Profile", href: "/profile", icon: UserIcon },
  { name: "Saved", href: "/saved", icon: Bookmark },
  { name: "Calendar", href: "/calendar", icon: Calendar },
  { name: "Document Checklist", href: "/documents", icon: FileText },
  { name: "Notifications", href: "/notifications", icon: Bell },
];

const MOBILE_ITEMS = ["Dashboard", "Explore", "Saved", "Calendar"];

export function Shell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const logout = useAuthStore((state) => state.logout);
  const authProvider = useAuthStore((state) => state.authProvider);
  const clearProfile = useProfileStore((state) => state.clearProfile);
  const clearSaved = useSavedStore((state) => state.clearAll);
  const clearDocuments = useDocumentStore((state) => state.clearAll);
  const clearNotifications = useNotificationStore((state) => state.clearAll);
  const profile = useProfileStore((state) => state.profile);
  const score = useProfileStore((state) => state.completenessScore);

  const name = profile?.name || "Guest User";
  const initials = name.split(" ").map((n: string) => n[0]).join("").substring(0, 2).toUpperCase();
  const subtitle = profile?.educationLevel ? profile.educationLevel.replace("-", " ") : "Profile Incomplete";

  const handleLogout = async () => {
    if (authProvider === "supabase") {
      clearProfile();
      clearSaved();
      clearDocuments();
      clearNotifications();
    }
    await logout();
    router.push("/login");
  };

  return (
    <div className="shell-layout">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <Link href="/dashboard" className="sidebar-brand">
            <div className="sidebar-brand-icon">
              <Compass size={16} />
            </div>
            AvasarSetu
          </Link>
        </div>

        <nav className="sidebar-nav">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link key={item.name} href={item.href} className={`nav-item${isActive ? " active" : ""}`}>
                <item.icon size={16} />
                {item.name}
              </Link>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <Link href="/settings" className={`nav-item${pathname === "/settings" ? " active" : ""}`}>
            <Settings size={16} /> Settings
          </Link>
          <button className="nav-item nav-item-danger" onClick={handleLogout}>
            <LogOut size={16} /> Log out
          </button>
          <div className="user-card">
            <div className="user-card-progress" style={{ width: `${score}%` }} />
            <div className="user-avatar">{initials}</div>
            <div style={{ overflow: "hidden" }}>
              <div className="user-name">{name}</div>
              <div className="user-subtitle">{subtitle}</div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="shell-main">
        {children}
      </main>

      {/* Mobile bottom nav */}
      <nav className="mobile-nav">
        {NAV_ITEMS.filter(i => MOBILE_ITEMS.includes(i.name)).map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link key={item.name} href={item.href} className={`mobile-nav-item${isActive ? " active" : ""}`}>
              <item.icon size={20} style={{ marginBottom: 2 }} />
              <span>{item.name}</span>
            </Link>
          );
        })}
        <Link href="/profile" className={`mobile-nav-item${pathname === "/profile" ? " active" : ""}`}>
          <UserIcon size={20} style={{ marginBottom: 2 }} />
          <span>Profile</span>
        </Link>
      </nav>
    </div>
  );
}
