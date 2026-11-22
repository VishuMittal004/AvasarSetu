import Link from "next/link";
import { WifiOff } from "lucide-react";

export default function OfflinePage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg)] p-6">
      <div className="max-w-sm w-full text-center">
        <div className="mb-6 flex justify-center text-[#10b981]"><WifiOff size={48} aria-hidden="true" /></div>
        <h1 className="text-2xl font-bold text-[#fafafa] mb-3">You&apos;re Offline</h1>
        <p className="text-[#52525b] mb-6 leading-relaxed">
          No internet connection detected. Your previously saved results and profile are still available.
        </p>
        <Link
          href="/dashboard"
          className="inline-block bg-[#10b981] hover:bg-[var(--accent-hover)] text-white font-bold py-3 px-6 rounded-xl transition-colors"
        >
          Go to Dashboard
        </Link>
      </div>
    </div>
  )
}


