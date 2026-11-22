'use client'

import { useEffect } from 'react'
import { AlertTriangle } from 'lucide-react'

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#09090b] p-6">
      <div className="max-w-md w-full text-center bg-[#18181b] dark:bg-[#18181b] rounded-2xl shadow-sm border border-[#27272a] border-[#27272a] p-8">
        <div className="mb-4 flex justify-center text-amber-400"><AlertTriangle size={40} aria-hidden="true" /></div>
        <h2 className="text-xl font-bold text-[#fafafa] text-[#fafafa] mb-2">Something went wrong</h2>
        <p className="text-sm text-[#52525b] dark:text-[#52525b] mb-6">
          An unexpected error occurred. Please try again.
        </p>
        <button
          onClick={reset}
          className="bg-[#2D7A4F] hover:bg-[#255f3e] text-white font-bold py-2.5 px-6 rounded-lg transition-colors text-sm"
        >
          Try Again
        </button>
      </div>
    </div>
  )
}



