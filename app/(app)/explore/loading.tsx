export default function ExploreLoading() {
  return (
    <div className="p-5 md:p-8 max-w-7xl mx-auto space-y-6 animate-pulse">
      <div className="h-14 bg-[#27272a] dark:bg-[#18181b] rounded-2xl" />
      <div className="flex gap-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-9 w-24 bg-[#27272a] dark:bg-[#18181b] rounded-full" />
        ))}
      </div>
      <div className="space-y-3">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-28 bg-[#27272a] dark:bg-[#18181b] rounded-xl" />
        ))}
      </div>
    </div>
  )
}



