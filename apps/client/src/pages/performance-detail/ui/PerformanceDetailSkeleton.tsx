const PerformanceDetailSkeleton = () => {
  return (
    <section aria-busy="true" aria-label="공연 회차 상세 정보를 불러오는 중" className="mx-auto w-full max-w-6xl animate-pulse">
      <div className="h-5 w-40 rounded bg-gray-200" />

      <div className="mt-5 rounded-2xl bg-gray-200 px-5 py-6 sm:px-8 sm:py-8">
        <div className="grid gap-8 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
          <div>
            <div className="flex gap-2">
              <div className="h-6 w-16 rounded-full bg-gray-300" />
              <div className="h-6 w-28 rounded-full bg-gray-300" />
            </div>
            <div className="mt-5 h-8 w-2/3 max-w-80 rounded bg-gray-300" />
            <div className="mt-3 h-4 w-4/5 max-w-96 rounded bg-gray-300" />
          </div>

          <div className="grid gap-3 sm:grid-cols-2 md:min-w-124">
            <div className="h-18 rounded-xl bg-gray-300" />
            <div className="h-18 rounded-xl bg-gray-300" />
          </div>
        </div>
      </div>

      <div className="mt-6 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-100 px-4 py-4 sm:px-6">
          <div className="h-6 w-32 rounded bg-gray-200" />
          <div className="mt-2 h-4 w-44 rounded bg-gray-100" />
        </div>

        <div className="px-3 py-5 sm:px-8 sm:py-7">
          <div className="mx-auto max-w-2xl">
            <div className="aspect-4/3 rounded-xl bg-gray-100" />
            <div className="mx-auto mt-6 h-4 w-56 rounded bg-gray-100" />
          </div>
        </div>
      </div>
    </section>
  );
};

export default PerformanceDetailSkeleton;
