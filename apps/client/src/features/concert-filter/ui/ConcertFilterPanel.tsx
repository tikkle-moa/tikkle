import ConcertBookingStatusFilterControls from "./ConcertBookingStatusFilterControls";
import ConcertDateRangeFilterControls from "./ConcertDateRangeFilterControls";
import ConcertGenreFilterControls from "./ConcertGenreFilterControls";

interface ConcertFilterPanelProps {
  selectedGenres: string[];
  selectedBookingStatuses: string[];
  startDate: string;
  endDate: string;
  activeFilterCount: number;
  onToggleGenre: (genre: string) => void;
  onToggleBookingStatus: (status: string) => void;
  onStartDateChange: (date: string) => void;
  onEndDateChange: (date: string) => void;
  onClearFilters: () => void;
}

const ConcertFilterPanel = ({
  selectedGenres,
  selectedBookingStatuses,
  startDate,
  endDate,
  activeFilterCount,
  onToggleGenre,
  onToggleBookingStatus,
  onStartDateChange,
  onEndDateChange,
  onClearFilters,
}: ConcertFilterPanelProps) => {
  return (
    <aside className="hidden w-56 shrink-0 self-start rounded-xl border border-violet-100 bg-violet-50/70 p-5 shadow-sm lg:sticky lg:top-4 lg:block">
      <div className="mb-5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-bold text-violet-950">필터</h2>

          {activeFilterCount > 0 && (
            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-violet-600 px-1 text-xs font-bold text-white">
              {activeFilterCount}
            </span>
          )}
        </div>

        <button type="button" className="text-xs text-violet-500 hover:underline" onClick={onClearFilters}>
          초기화
        </button>
      </div>

      <section className="border-t border-violet-100 pt-5" aria-labelledby="desktop-filter-genre">
        <h3 id="desktop-filter-genre" className="mb-3 text-sm font-bold text-gray-900">
          장르
        </h3>
        <ConcertGenreFilterControls selectedGenres={selectedGenres} onToggleGenre={onToggleGenre} />
      </section>

      <section className="mt-5 border-t border-violet-100 pt-5" aria-labelledby="desktop-filter-status">
        <h3 id="desktop-filter-status" className="mb-3 text-sm font-bold text-gray-900">
          예매 상태
        </h3>
        <ConcertBookingStatusFilterControls selectedBookingStatuses={selectedBookingStatuses} onToggleBookingStatus={onToggleBookingStatus} />
      </section>

      <section className="mt-5 border-t border-violet-100 pt-5" aria-labelledby="desktop-filter-date">
        <h3 id="desktop-filter-date" className="mb-3 text-sm font-bold text-gray-900">
          공연일
        </h3>
        <ConcertDateRangeFilterControls
          startDate={startDate}
          endDate={endDate}
          onStartDateChange={onStartDateChange}
          onEndDateChange={onEndDateChange}
        />
      </section>
    </aside>
  );
};

export default ConcertFilterPanel;
