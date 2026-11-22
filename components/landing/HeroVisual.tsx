import { HeroMatchCard } from "./HeroMatchCard";
import { Search, Bell, Bookmark } from "lucide-react";

export function HeroVisual() {
  return (
    <div className="relative w-full h-[500px] lg:h-[600px] mt-8 lg:mt-0">
      {/* Main product visual panel */}
      <div className="absolute inset-0 bg-[var(--bg-elevated)] rounded-[1.5rem] shadow-[var(--shadow-lg)] border border-[var(--border)] flex flex-col overflow-hidden z-10">
        
        {/* Top Accent Line */}
        <div className="h-1.5 w-full bg-[var(--accent)]" />
        
        {/* Mock Header */}
        <div className="h-16 border-b border-[var(--border)] flex items-center justify-between px-6 bg-[var(--bg-hover)]/50">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded bg-[var(--accent-subtle)] flex items-center justify-center">
              <Search className="h-4 w-4 text-[var(--accent)]" />
            </div>
            <div className="h-3 w-32 bg-[var(--border)] rounded-full" />
          </div>
          <div className="flex items-center gap-4">
            <div className="h-8 w-8 rounded-full bg-[var(--border)]/50 flex items-center justify-center">
              <Bell className="h-4 w-4 text-[var(--text-muted)]" />
            </div>
            <div className="h-8 w-8 rounded-full bg-[var(--accent-subtle)]" />
          </div>
        </div>

        {/* Mock Content Layout */}
        <div className="flex-1 p-6 lg:p-8 flex gap-6 bg-[var(--bg)]/30">
          {/* Mock Sidebar */}
          <div className="w-1/3 hidden sm:flex flex-col gap-4">
            <div className="h-6 w-24 bg-[var(--border)] rounded-full mb-2" />
            <div className="h-10 w-full bg-[var(--accent-subtle)] rounded-xl border border-[var(--accent)]/20" />
            <div className="h-10 w-full bg-[var(--bg-hover)] rounded-xl border border-[var(--border)]" />
            <div className="h-10 w-full bg-[var(--bg-hover)] rounded-xl border border-[var(--border)]" />
            <div className="h-10 w-full bg-[var(--bg-hover)] rounded-xl border border-[var(--border)]" />
          </div>
          
          {/* Mock Main Area */}
          <div className="flex-1 flex flex-col gap-6">
            <div className="flex items-center justify-between mb-2">
              <div className="h-7 w-48 bg-[var(--border)] rounded-full" />
              <div className="h-7 w-20 bg-[var(--accent-subtle)] rounded-full" />
            </div>
            
            {/* Mock Cards */}
            <div className="bg-[var(--bg-elevated)] p-5 rounded-2xl border border-[var(--border)] flex flex-col gap-4">
               <div className="flex justify-between items-start">
                 <div className="h-5 w-32 bg-[var(--text-primary)] opacity-80 rounded-full" />
                 <Bookmark className="h-5 w-5 text-[var(--text-muted)]" />
               </div>
               <div className="h-3 w-3/4 bg-[var(--text-muted)] opacity-50 rounded-full" />
               <div className="h-3 w-1/2 bg-[var(--text-muted)] opacity-50 rounded-full" />
               <div className="mt-2 flex gap-2">
                 <div className="h-6 w-20 bg-[var(--accent-subtle)] rounded-full" />
                 <div className="h-6 w-16 bg-[var(--border)] rounded-full" />
               </div>
            </div>

            <div className="bg-[var(--bg-elevated)] p-5 rounded-2xl border border-[var(--border)] flex flex-col gap-4 opacity-70">
               <div className="flex justify-between items-start">
                 <div className="h-5 w-40 bg-[var(--text-primary)] opacity-80 rounded-full" />
                 <Bookmark className="h-5 w-5 text-[var(--text-muted)]" />
               </div>
               <div className="h-3 w-2/3 bg-[var(--text-muted)] opacity-50 rounded-full" />
               <div className="h-3 w-1/3 bg-[var(--text-muted)] opacity-50 rounded-full" />
            </div>
          </div>
        </div>
      </div>
      
      {/* Floating Verification Card */}
      <HeroMatchCard />
    </div>
  );
}
