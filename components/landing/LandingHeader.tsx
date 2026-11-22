import Link from "next/link";
import { Compass } from "lucide-react";
import { Button } from "@/components/ui/button";

export function LandingHeader() {
  return (
    <header className="h-[72px] bg-[var(--bg-elevated)]/80 backdrop-blur-md border-b border-[var(--border)] w-full flex items-center sticky top-0 z-50">
      <div className="container mx-auto px-4 md:px-6 w-full max-w-7xl flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-lg bg-[var(--accent)] flex items-center justify-center text-white shadow-[var(--shadow-glow)]">
            <Compass className="h-4 w-4" />
          </div>
          <span className="font-bold text-lg tracking-tight text-[var(--text-primary)]">
            AvasarSetu
          </span>
        </Link>
        
        {/* CTAs */}
        <div className="flex items-center gap-4">
          <Link 
            href="/login" 
            className="hidden sm:inline-block text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
          >
            Log in
          </Link>
          <Link href="/onboarding">
            <Button size="sm" className="rounded-lg px-5 font-semibold h-9 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white">
              Create Profile
            </Button>
          </Link>
        </div>
      </div>
    </header>
  );
}
