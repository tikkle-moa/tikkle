import { Link } from "react-router";

import { Plus } from "lucide-react";

import { ROUTE_PATHS } from "@shared/config/router.config";

import { ConcertCard, ConcertCardSkeleton, useConcerts } from "@entities/concert";
import { USER_ROLE, useSessionStore } from "@entities/session";

import {
  ConcertFilterPanel,
  MobileConcertFilterButton,
  MobileConcertFilterPanel,
  useConcertListFilterSearchParams,
  useMobileConcertListFilterToggle,
} from "@features/concert-filter";

import { CONCERT_LIST_SKELETON_COUNT } from "../model/concert-list.constants";

const ConcertListPage = () => {
  const user = useSessionStore((state) => state.user);
  const isAdmin = user?.role === USER_ROLE.ADMIN;
  const {
    selectedGenres,
    selectedBookingStatuses,
    startDate,
    endDate,
    activeFilterCount,
    toggleGenre,
    toggleBookingStatus,
    changeStartDate,
    changeEndDate,
    clearFilters,
  } = useConcertListFilterSearchParams();
  const { isMobileFilterOpen, toggleMobileFilter } = useMobileConcertListFilterToggle();
  const { data: concerts = [], isPending, isError } = useConcerts();

  return (
    <section className="mx-auto max-w-6xl">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-lg font-bold text-gray-900 sm:text-xl">공연 목록</h1>
        <div className="flex items-center gap-3">
          {isAdmin && (
            <Link
              to={ROUTE_PATHS.CONCERT_NEW}
              className="bg-brand-primary inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-white transition hover:brightness-95"
            >
              <Plus className="size-4" aria-hidden />
              콘서트 등록
            </Link>
          )}
          <MobileConcertFilterButton isOpen={isMobileFilterOpen} activeFilterCount={activeFilterCount} onClick={toggleMobileFilter} />
        </div>
      </div>

      {isMobileFilterOpen && (
        <MobileConcertFilterPanel
          selectedGenres={selectedGenres}
          selectedBookingStatuses={selectedBookingStatuses}
          startDate={startDate}
          endDate={endDate}
          activeFilterCount={activeFilterCount}
          onToggleGenre={toggleGenre}
          onToggleBookingStatus={toggleBookingStatus}
          onStartDateChange={changeStartDate}
          onEndDateChange={changeEndDate}
          onClearFilters={clearFilters}
        />
      )}

      <div className="flex items-start gap-8">
        <ConcertFilterPanel
          selectedGenres={selectedGenres}
          selectedBookingStatuses={selectedBookingStatuses}
          startDate={startDate}
          endDate={endDate}
          activeFilterCount={activeFilterCount}
          onToggleGenre={toggleGenre}
          onToggleBookingStatus={toggleBookingStatus}
          onStartDateChange={changeStartDate}
          onEndDateChange={changeEndDate}
          onClearFilters={clearFilters}
        />
        <div className="min-w-0 flex-1">
          {isPending && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {Array.from({ length: CONCERT_LIST_SKELETON_COUNT }).map((_, index) => (
                <ConcertCardSkeleton
                  key={index}
                  displayOptions={{
                    showTitle: true,
                    showPlaceName: true,
                    showPeriod: true,
                  }}
                />
              ))}
            </div>
          )}

          {isError && <p className="text-sm text-gray-400">공연 정보를 불러오지 못했습니다.</p>}

          {!isPending && !isError && concerts.length === 0 && <p className="text-sm text-gray-400">등록된 공연이 없습니다.</p>}

          {!isPending && !isError && concerts.length > 0 && (
            <div data-testid="concert-list-grid" className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {concerts.map((concert) => (
                <ConcertCard
                  key={concert.id}
                  concert={concert}
                  displayOptions={{
                    showStatus: true,
                    showGenre: true,
                    showTitle: true,
                    showPlaceName: true,
                    showPeriod: true,
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default ConcertListPage;
