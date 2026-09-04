import { Link } from "react-router";

import { ArrowDownAZ, ArrowUpAZ, Plus } from "lucide-react";

import { ROUTE_PATHS } from "@shared/config/router.config";

import { VenueCard, VenueCardSkeleton } from "@entities/venue";

import {
  MobileVenueFilter,
  MobileVenueFilterPanel,
  VENUE_LIST_SORT_DIRECTIONS,
  VENUE_LIST_SORT_OPTIONS,
  VenueFilterPanel,
} from "@features/venue-filter";

import { useVenueList } from "../model/use-venue-list";
import { useVenueListFilter } from "../model/use-venue-list-filter";
import { VENUE_LIST_SKELETON_COUNT } from "../model/venue-list.constants";

const VenueListPage = () => {
  const {
    isMobileFilterOpen,
    toggleMobileFilter,
    searchValue,
    searchKeyword,
    selectedRegions,
    minCapacity,
    sort,
    sortDirection,
    activeFilterCount,
    handleSearchInputChange,
    toggleRegion,
    changeMinCapacity,
    changeSort,
    changeSortDirection,
    clearFilters,
  } = useVenueListFilter();
  const { isAdmin, filteredVenues, allRegions, isPending, isError } = useVenueList({
    searchKeyword,
    selectedRegions,
    minCapacity,
    sort,
    sortDirection,
  });

  return (
    <section className="mx-auto w-full max-w-6xl">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-bold text-slate-900 sm:text-xl">공연장 목록</h1>
          <p className="mt-1 text-sm text-slate-500">등록된 공연장과 기본 배치 정보를 확인하세요.</p>
        </div>
        <div className="flex shrink-0 flex-col items-center gap-2 sm:flex-row">
          {isAdmin && (
            <Link
              className="bg-brand-primary inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-xs font-semibold text-white hover:brightness-95 md:text-sm"
              to={ROUTE_PATHS.VENUE_NEW}
            >
              <Plus className="size-4" aria-hidden /> 공연장 등록
            </Link>
          )}
          <MobileVenueFilter isOpen={isMobileFilterOpen} activeFilterCount={activeFilterCount} onToggle={toggleMobileFilter} />
        </div>
      </div>

      {isMobileFilterOpen && (
        <MobileVenueFilterPanel
          allRegions={allRegions}
          searchValue={searchValue}
          selectedRegions={selectedRegions}
          minCapacity={minCapacity}
          activeFilterCount={activeFilterCount}
          onSearchInputChange={handleSearchInputChange}
          onToggleRegion={toggleRegion}
          onChangeMinCapacity={changeMinCapacity}
          onClearFilters={clearFilters}
        />
      )}

      <div className="flex flex-col gap-6 lg:flex-row">
        <VenueFilterPanel
          allRegions={allRegions}
          searchValue={searchValue}
          selectedRegions={selectedRegions}
          minCapacity={minCapacity}
          activeFilterCount={activeFilterCount}
          onSearchInputChange={handleSearchInputChange}
          onToggleRegion={toggleRegion}
          onChangeMinCapacity={changeMinCapacity}
          onClearFilters={clearFilters}
        />

        <div className="min-w-0 flex-1 space-y-6">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-slate-600">
              총 <strong className="font-bold text-slate-900">{filteredVenues.length}</strong>개의 공연장
            </p>
            <div className="flex items-center gap-2">
              <label htmlFor="venue-sort" className="sr-only">
                정렬 기준
              </label>
              <select
                id="venue-sort"
                value={sort}
                className="cursor-pointer rounded-lg border border-violet-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition-colors outline-none hover:border-violet-300 focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                onChange={(event) => changeSort(event.target.value as keyof typeof VENUE_LIST_SORT_OPTIONS)}
              >
                {Object.entries(VENUE_LIST_SORT_OPTIONS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
              <button
                type="button"
                aria-label={VENUE_LIST_SORT_DIRECTIONS[sortDirection === "asc" ? "desc" : "asc"] + "으로 변경"}
                title={VENUE_LIST_SORT_DIRECTIONS[sortDirection]}
                onClick={() => changeSortDirection(sortDirection === "asc" ? "desc" : "asc")}
                className="flex size-9 items-center justify-center rounded-lg border border-violet-200 bg-white text-slate-600 transition-colors hover:border-violet-300 hover:bg-violet-50 hover:text-violet-700 focus-visible:ring-2 focus-visible:ring-violet-100 focus-visible:outline-none"
              >
                {sortDirection === "asc" ? <ArrowDownAZ className="size-4" aria-hidden /> : <ArrowUpAZ className="size-4" aria-hidden />}
              </button>
            </div>
          </div>

          {isError && (
            <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              공연장 정보를 불러오지 못했습니다.
            </p>
          )}

          {!isError && isPending && (
            <div aria-label="공연장 목록을 불러오는 중" className="grid grid-cols-2 gap-4 sm:grid-cols-3 2xl:grid-cols-4">
              {Array.from({ length: VENUE_LIST_SKELETON_COUNT }, (_, index) => (
                <VenueCardSkeleton key={index} />
              ))}
            </div>
          )}

          {!isError && !isPending && filteredVenues.length === 0 && (
            <p className="rounded-lg border border-dashed border-slate-300 px-4 py-12 text-center text-sm text-slate-500">
              등록된 공연장이 없습니다.
            </p>
          )}

          {!isError && !isPending && filteredVenues.length > 0 && (
            <div data-testid="venue-list-grid" className="grid grid-cols-2 gap-4 sm:grid-cols-3 2xl:grid-cols-4">
              {filteredVenues.map((venue) => (
                <VenueCard venue={venue} />
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default VenueListPage;
