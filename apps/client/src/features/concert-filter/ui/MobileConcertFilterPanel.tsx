import ConcertBookingStatusFilterControls from "./ConcertBookingStatusFilterControls";
import ConcertDateRangeFilterControls from "./ConcertDateRangeFilterControls";
import ConcertGenreFilterControls from "./ConcertGenreFilterControls";

interface MobileConcertFilterPanelProps {
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

const MobileConcertFilterPanel = ({
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
}: MobileConcertFilterPanelProps) => {
  return (
    <div
      id="mobile-concert-list-filter-panel"
      className="mb-6 overflow-hidden rounded-xl border border-violet-100 bg-violet-50/70 shadow-sm lg:hidden"
    >
      <div className="flex items-center justify-between border-b border-violet-100 px-4 py-3">
        <p className="text-sm font-bold text-violet-950">필터</p>

        {activeFilterCount > 0 && (
          <button type="button" className="text-xs font-medium text-violet-600 hover:underline" onClick={onClearFilters}>
            초기화
          </button>
        )}
      </div>
      <div className="divide-y divide-violet-100">
        <section className="grid grid-cols-[3.5rem_minmax(0,1fr)] items-start gap-3 p-4" aria-labelledby="mobile-filter-genre">
          <h2 id="mobile-filter-genre" className="text-sm font-bold text-gray-900">
            장르
          </h2>
          <ConcertGenreFilterControls selectedGenres={selectedGenres} onToggleGenre={onToggleGenre} />
        </section>

        <section className="grid grid-cols-[3.5rem_minmax(0,1fr)] items-start gap-3 p-4" aria-labelledby="mobile-filter-status">
          <h2 id="mobile-filter-status" className="text-sm font-bold text-gray-900">
            상태
          </h2>
          <ConcertBookingStatusFilterControls selectedBookingStatuses={selectedBookingStatuses} onToggleBookingStatus={onToggleBookingStatus} />
        </section>

        <section className="grid grid-cols-[3.5rem_minmax(0,1fr)] items-start gap-3 p-4" aria-labelledby="mobile-filter-date">
          <h2 id="mobile-filter-date" className="text-sm font-bold text-gray-900">
            공연일
          </h2>
          <ConcertDateRangeFilterControls
            startDate={startDate}
            endDate={endDate}
            onStartDateChange={onStartDateChange}
            onEndDateChange={onEndDateChange}
          />
        </section>
      </div>
    </div>
  );
};

export default MobileConcertFilterPanel;
