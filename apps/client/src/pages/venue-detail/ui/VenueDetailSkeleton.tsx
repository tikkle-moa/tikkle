const VenueDetailSkeleton = () => {
  return (
    <section aria-busy="true" aria-label="공연장 상세 정보를 불러오는 중" className="mx-auto w-full max-w-6xl animate-pulse">
      <div className="rounded-2xl bg-gray-200 px-5 py-6 sm:px-8 sm:py-8">
        <div className="h-4 w-20 rounded bg-gray-300" />
        <div className="mt-5 h-8 w-2/3 max-w-80 rounded bg-gray-300" />
        <div className="mt-3 h-4 w-2/5 max-w-64 rounded bg-gray-300" />
        <div className="mt-4 h-4 w-4/5 max-w-2xl rounded bg-gray-300" />
      </div>

      <div className="mt-6 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-100 px-4 py-4 sm:px-6">
          <div className="h-6 w-32 rounded bg-gray-200" />
          <div className="mt-2 h-4 w-44 rounded bg-gray-100" />
        </div>

        <div className="px-3 py-5 sm:px-8 sm:py-7">
          <div className="aspect-4/3 rounded-xl bg-gray-100" />
        </div>
      </div>
    </section>
  );
};

export default VenueDetailSkeleton;
