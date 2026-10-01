const MyReservationSkeleton = () => (
  <section aria-label="예매 상세 정보를 불러오는 중" aria-busy="true" className="mx-auto w-full max-w-screen-sm animate-pulse">
    <div className="h-7 w-1/2 rounded bg-gray-200" />
    <div className="mt-6 h-64 rounded-xl border border-gray-200 bg-gray-100" />
  </section>
);

export default MyReservationSkeleton;
