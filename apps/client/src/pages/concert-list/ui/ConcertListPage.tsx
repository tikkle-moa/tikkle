import { Link, generatePath } from "react-router";

import { Plus } from "lucide-react";

import { ROUTE_PATHS } from "@shared/config/router.config";

import { ConcertCard, ConcertCardSkeleton } from "@entities/concert";

import { ConcertFilterPanel, MobileConcertFilterButton, MobileConcertFilterPanel } from "@features/concert-filter";

import { CONCERT_LIST_SKELETON_COUNT } from "../model/concert-list.constants";
import { useConcertList } from "../model/use-concert-list";

const ConcertListPage = () => {
  const { isAdmin, concerts, isPending, isError, filter, mobileFilter } = useConcertList();

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
          <MobileConcertFilterButton
            isOpen={mobileFilter.isMobileFilterOpen}
            activeFilterCount={filter.activeFilterCount}
            onClick={mobileFilter.toggleMobileFilter}
          />
        </div>
      </div>

      {mobileFilter.isMobileFilterOpen && (
        <MobileConcertFilterPanel
          selectedGenres={filter.selectedGenres}
          selectedBookingStatuses={filter.selectedBookingStatuses}
          startDate={filter.startDate}
          endDate={filter.endDate}
          activeFilterCount={filter.activeFilterCount}
          onToggleGenre={filter.toggleGenre}
          onToggleBookingStatus={filter.toggleBookingStatus}
          onStartDateChange={filter.changeStartDate}
          onEndDateChange={filter.changeEndDate}
          onClearFilters={filter.clearFilters}
        />
      )}

      <div className="flex items-start gap-8">
        <ConcertFilterPanel
          selectedGenres={filter.selectedGenres}
          selectedBookingStatuses={filter.selectedBookingStatuses}
          startDate={filter.startDate}
          endDate={filter.endDate}
          activeFilterCount={filter.activeFilterCount}
          onToggleGenre={filter.toggleGenre}
          onToggleBookingStatus={filter.toggleBookingStatus}
          onStartDateChange={filter.changeStartDate}
          onEndDateChange={filter.changeEndDate}
          onClearFilters={filter.clearFilters}
        />
        <div className="min-w-0 flex-1">
          {isPending && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {Array.from({ length: CONCERT_LIST_SKELETON_COUNT }).map((_, index) => (
                <ConcertCardSkeleton key={index} displayOptions={{ showTitle: true, showPlaceName: true }} />
              ))}
            </div>
          )}

          {isError && <p className="text-sm text-gray-400">공연 정보를 불러오지 못했습니다.</p>}

          {!isPending && !isError && concerts.length === 0 && <p className="text-sm text-gray-400">등록된 공연이 없습니다.</p>}

          {!isPending && !isError && concerts.length > 0 && (
            <div data-testid="concert-list-grid" className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {concerts.map((concert) => (
                <Link
                  key={concert.id}
                  aria-label={`${concert.title} 상세 보기`}
                  className="block"
                  to={generatePath(ROUTE_PATHS.CONCERT_DETAIL, {
                    concertId: String(concert.id),
                  })}
                >
                  <ConcertCard concert={concert} displayOptions={{ showGenre: true, showTitle: true, showPlaceName: true }} />
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default ConcertListPage;
