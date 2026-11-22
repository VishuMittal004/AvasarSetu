import { Check } from "lucide-react";

export function HeroMatchCard() {
  return (
    <div className="absolute -right-8 -bottom-8 w-56 bg-[var(--bg-elevated)] rounded-2xl shadow-[var(--shadow-lg)] border border-[var(--border)] p-4 transform -rotate-3 z-20">
      <div className="flex items-start gap-3 mb-4">
        <div className="h-10 w-10 shrink-0 rounded-full bg-[var(--accent)] flex items-center justify-center text-white shadow-sm">
          <Check className="h-5 w-5" strokeWidth={3} />
        </div>
        <div className="flex flex-col gap-1.5 mt-1">
          <div className="h-2.5 w-24 bg-[var(--text-primary)] rounded-full opacity-80" />
          <div className="h-2 w-16 bg-[var(--text-muted)] rounded-full opacity-60" />
        </div>
      </div>
      
      <div className="space-y-2 mt-4 bg-[var(--bg-hover)] p-3 rounded-xl border border-[var(--border)]">
        <div className="flex justify-between items-center">
          <div className="h-2 w-12 bg-[var(--text-muted)] rounded-full opacity-50" />
          <div className="h-2 w-8 bg-[var(--accent)] rounded-full opacity-90" />
        </div>
        <div className="h-1.5 w-full bg-[var(--accent-subtle)] rounded-full overflow-hidden">
          <div className="h-full w-4/5 bg-[var(--accent)] rounded-full" />
        </div>
      </div>
    </div>
  );
}
