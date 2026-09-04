const VenueCardSkeleton = () => (
  <div
    aria-hidden
    className="flex h-full animate-pulse flex-col gap-3 rounded-2xl border border-violet-100 bg-linear-to-br from-white via-violet-50/30 to-indigo-50/70 p-5 shadow-sm"
  >
    <div className="flex min-w-0 items-center gap-2">
      <div className="size-8 shrink-0 rounded-xl bg-violet-200/70 md:size-10 lg:size-12" />
      <div className="h-5 w-2/3 rounded bg-slate-200 md:h-6 lg:h-7" />
    </div>

    <div className="grid grid-cols-[repeat(auto-fit,minmax(80px,1fr))] gap-2">
      {Array.from({ length: 2 }, (_, index) => (
        <div key={index} className="flex flex-col items-center gap-1 rounded-xl border border-violet-100 bg-violet-100/40 px-3 py-2.5">
          <div className="h-4 w-10 rounded bg-violet-200/70" />
          <div className="h-5 w-12 rounded bg-violet-200/70" />
        </div>
      ))}
    </div>

    <div className="border-t border-violet-100" />

    <div className="flex items-center gap-2">
      <div className="size-4 shrink-0 rounded bg-amber-200/80" />
      <div className="h-4 w-20 rounded bg-slate-200" />
    </div>

    <div className="border-t border-violet-100" />

    <div className="flex min-w-0 items-center gap-1.5">
      <div className="size-4 shrink-0 rounded bg-violet-200/70" />
      <div className="h-5 w-4/5 rounded bg-slate-200" />
    </div>
  </div>
);

export default VenueCardSkeleton;
