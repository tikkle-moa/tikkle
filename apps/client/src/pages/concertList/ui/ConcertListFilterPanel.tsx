import { BOOKING_STATUS_MAP, CONCERT_GENRE_MAP } from "@entities/concert";

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
        <div className="flex flex-wrap gap-2">
          {Object.entries(CONCERT_GENRE_MAP).map(([genre, { label }]) => (
            <button
              key={genre}
              type="button"
              disabled
              className="rounded-full border border-violet-100 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 disabled:cursor-not-allowed"
            >
              {label}
            </button>
          ))}
        </div>
      </section>

      <section className="mt-5 border-t border-violet-100 pt-5" aria-labelledby="desktop-filter-status">
        <h3 id="desktop-filter-status" className="mb-3 text-sm font-bold text-gray-900">
          예매 상태
        </h3>
        <div className="flex flex-col gap-2.5">
          {Object.entries(BOOKING_STATUS_MAP)
            .filter(([status]) => status !== "ended")
            .map(([status, { label }]) => (
              <label key={status} className="flex items-center gap-2 text-sm text-gray-600">
                <input type="checkbox" disabled className="size-4 accent-violet-600" />
                {label}
              </label>
            ))}
        </div>
      </section>

      <section className="mt-5 border-t border-violet-100 pt-5" aria-labelledby="desktop-filter-date">
        <h3 id="desktop-filter-date" className="mb-3 text-sm font-bold text-gray-900">
          공연일
        </h3>
        <div className="flex flex-col gap-2">
          <label className="text-xs text-gray-500">
            시작일
            <input type="date" disabled className="mt-1 w-full rounded-lg border border-violet-100 bg-white px-3 py-2 text-sm text-gray-500" />
          </label>

          <label className="text-xs text-gray-500">
            종료일
            <input type="date" disabled className="mt-1 w-full rounded-lg border border-violet-100 bg-white px-3 py-2 text-sm text-gray-500" />
          </label>
        </div>
      </section>
    </aside>
  );
};

export default ConcertListFilterPanel;
