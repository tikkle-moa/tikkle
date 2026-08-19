import ConcertListBookingStatusControls from "./ConcertListBookingStatusControls";
import ConcertListDateRangeControls from "./ConcertListDateRangeControls";
import ConcertListGenreFilterControls from "./ConcertListGenreFilterControls";

const ConcertListFilterPanel = () => {
  return (
    <aside className="hidden w-56 shrink-0 self-start rounded-xl border border-violet-100 bg-violet-50/70 p-5 shadow-sm lg:block">
      <div className="mb-5 flex items-center justify-between">
        <h2 className="text-base font-bold text-violet-950">필터</h2>
        <button type="button" disabled className="text-xs text-violet-400">
          초기화
        </button>
      </div>

      <section className="border-t border-violet-100 pt-5" aria-labelledby="desktop-filter-genre">
        <h3 id="desktop-filter-genre" className="mb-3 text-sm font-bold text-gray-900">
          장르
        </h3>
        <ConcertListGenreFilterControls />
      </section>

      <section className="mt-5 border-t border-violet-100 pt-5" aria-labelledby="desktop-filter-status">
        <h3 id="desktop-filter-status" className="mb-3 text-sm font-bold text-gray-900">
          예매 상태
        </h3>
        <ConcertListBookingStatusControls />
      </section>

      <section className="mt-5 border-t border-violet-100 pt-5" aria-labelledby="desktop-filter-date">
        <h3 id="desktop-filter-date" className="mb-3 text-sm font-bold text-gray-900">
          공연일
        </h3>
        <ConcertListDateRangeControls />
      </section>
    </aside>
  );
};

export default ConcertListFilterPanel;
