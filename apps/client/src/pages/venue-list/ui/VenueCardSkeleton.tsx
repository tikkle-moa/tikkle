const VenueCardSkeleton = () => (
  <div aria-hidden className="flex h-full animate-pulse flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
    <div className="flex flex-1 flex-col gap-3">
      <div className="flex min-w-0 items-center gap-2">
        <div className="size-8 shrink-0 rounded-xl bg-slate-200 md:size-10 lg:size-12" />
        <div className="h-5 w-2/3 rounded bg-slate-200 lg:h-6" />
      </div>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(80px,1fr))] gap-2">
        {Array.from({ length: 2 }, (_, index) => (
          <div key={index} className="flex flex-col items-center gap-1 rounded-xl bg-slate-50 px-3 py-2.5">
            <div className="h-3.5 w-10 rounded bg-slate-200" />
            <div className="h-5 w-12 rounded bg-slate-200" />
          </div>
        ))}
      </div>

      <div className="border-t border-slate-200" />
      <div className="flex items-center gap-2">
        <div className="size-4 shrink-0 rounded bg-slate-200" />
        <div className="h-4 w-20 rounded bg-slate-200" />
      </div>
    </div>

    <div className="border-t border-slate-200" />
    <div className="flex min-w-0 items-center gap-1.5">
      <div className="size-4 shrink-0 rounded bg-slate-200" />
      <div className="h-5 w-4/5 rounded bg-slate-200" />
    </div>
  </div>
);

export default VenueCardSkeleton;
