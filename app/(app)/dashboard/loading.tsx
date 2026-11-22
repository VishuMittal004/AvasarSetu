export default function DashboardLoading() {
  return (
    <div className="p-5 md:p-8 max-w-7xl mx-auto space-y-6 animate-pulse">
      <div className="h-8 bg-[#27272a] dark:bg-[#18181b] rounded w-48" />
      <div className="h-14 bg-[#27272a] dark:bg-[#18181b] rounded-2xl" />
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-16 bg-[#27272a] dark:bg-[#18181b] rounded-xl" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 bg-[#27272a] dark:bg-[#18181b] rounded-xl" />
          ))}
        </div>
        <div className="space-y-4">
          <div className="h-32 bg-[#27272a] dark:bg-[#18181b] rounded-xl" />
          <div className="h-32 bg-[#27272a] dark:bg-[#18181b] rounded-xl" />
        </div>
      </div>
    </div>
  )
}



