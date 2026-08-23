const ConcertDetailSkeleton = () => (
  <section aria-label="콘서트 상세 정보를 불러오는 중" className="grid animate-pulse gap-8 lg:grid-cols-[18rem_minmax(0,1fr)_20.5rem]">
    <div className="aspect-3/4 rounded-xl bg-gray-200" />

    <div className="space-y-5">
      <div className="h-6 w-16 rounded bg-gray-200" />
      <div className="h-10 w-3/4 rounded bg-gray-200" />
      <div className="h-28 rounded bg-gray-100" />
    </div>

    <div className="h-72 rounded-xl border border-gray-100 bg-gray-100" />
  </section>
);

export default ConcertDetailSkeleton;
