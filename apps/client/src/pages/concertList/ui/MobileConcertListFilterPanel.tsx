import ConcertListBookingStatusControls from "./ConcertListBookingStatusControls";
import ConcertListDateRangeControls from "./ConcertListDateRangeControls";
import ConcertListGenreFilterControls from "./ConcertListGenreFilterControls";

const MobileConcertListFilterPanel = () => {
  return (
    <div
      id="mobile-concert-list-filter-panel"
      className="mb-6 overflow-hidden rounded-xl border border-violet-100 bg-violet-50/70 shadow-sm lg:hidden"
    >
      <div className="divide-y divide-violet-100">
        <section className="grid grid-cols-[3.5rem_minmax(0,1fr)] items-start gap-3 p-4" aria-labelledby="mobile-filter-genre">
          <h2 id="mobile-filter-genre" className="text-sm font-bold text-gray-900">
            장르
          </h2>
          <ConcertListGenreFilterControls />
        </section>

        <section className="grid grid-cols-[3.5rem_minmax(0,1fr)] items-start gap-3 p-4" aria-labelledby="mobile-filter-status">
          <h2 id="mobile-filter-status" className="text-sm font-bold text-gray-900">
            상태
          </h2>
          <ConcertListBookingStatusControls />
        </section>

        <section className="grid grid-cols-[3.5rem_minmax(0,1fr)] items-start gap-3 p-4" aria-labelledby="mobile-filter-date">
          <h2 id="mobile-filter-date" className="text-sm font-bold text-gray-900">
            공연일
          </h2>
          <ConcertListDateRangeControls />
        </section>
      </div>
    </div>
  );
};

export default MobileConcertListFilterPanel;
