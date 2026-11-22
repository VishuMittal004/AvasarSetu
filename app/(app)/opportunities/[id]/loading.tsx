export default function OpportunityLoading() {
  return (
    <div className="p-5 md:p-8 max-w-4xl mx-auto space-y-6 animate-pulse">
      <div className="h-6 bg-slate-200 dark:bg-slate-800 rounded w-24" />
      <div className="space-y-3">
        <div className="h-8 bg-slate-200 dark:bg-slate-800 rounded w-3/4" />
        <div className="h-5 bg-slate-200 dark:bg-slate-800 rounded w-1/2" />
      </div>
      <div className="h-32 bg-slate-200 dark:bg-slate-800 rounded-xl" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-24 bg-slate-200 dark:bg-slate-800 rounded-xl" />
        ))}
      </div>
    </div>
  )
}

