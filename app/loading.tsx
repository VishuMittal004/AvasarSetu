export default function RootLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#09090b]">
      <div className="flex flex-col items-center gap-4">
        <div className="animate-spin h-12 w-12 border-4 border-[#2D7A4F] border-t-transparent rounded-full" />
        <p className="text-sm font-medium text-slate-500">Loading AvasarSetu...</p>
      </div>
    </div>
  )
}



