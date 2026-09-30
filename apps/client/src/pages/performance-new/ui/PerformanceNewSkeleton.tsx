const PerformanceNewSkeleton = () => (
  <section
    aria-busy="true"
    aria-live="polite"
    className="mx-auto w-full max-w-4xl animate-pulse rounded-2xl border border-slate-200 bg-white p-6 sm:p-8"
    role="status"
  >
    <span className="sr-only">콘서트 정보를 불러오는 중입니다.</span>

    <div className="h-7 w-40 rounded bg-slate-200" />
    <div className="mt-3 h-4 w-80 max-w-full rounded bg-slate-100" />

    <div className="mt-8 overflow-hidden rounded-xl border border-slate-100">
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
        <div>
          <div className="h-5 w-20 rounded bg-slate-200" />
          <div className="mt-2 h-3 w-32 rounded bg-slate-100" />
        </div>
        <div className="h-9 w-14 rounded-lg bg-slate-200" />
      </div>

      <div className="space-y-4 px-5 py-5">
        <div className="h-12 rounded bg-slate-100" />
        <div className="h-12 rounded bg-slate-100" />
      </div>
    </div>
  </section>
);

export default PerformanceNewSkeleton;
