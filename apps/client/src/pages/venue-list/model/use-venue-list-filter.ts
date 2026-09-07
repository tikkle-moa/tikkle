import { type ChangeEvent, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router";

import { VENUE_LIST_FILTER_KEYS, type VenueSort, type VenueSortDirection, isVenueSort, isVenueSortDirection } from "@features/venue-filter";

export const useVenueListFilter = () => {
  const [searchValue, setSearchValue] = useState("");
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);

  const [searchParams, setSearchParams] = useSearchParams();
  const searchKeyword = searchParams.get(VENUE_LIST_FILTER_KEYS.keyword) ?? "";
  const selectedRegions = searchParams.getAll(VENUE_LIST_FILTER_KEYS.region);
  const minCapacityParam = Number(searchParams.get(VENUE_LIST_FILTER_KEYS.minCapacity));
  const sortParam = searchParams.get(VENUE_LIST_FILTER_KEYS.sort);
  const sortDirectionParam = searchParams.get(VENUE_LIST_FILTER_KEYS.direction);
  const minCapacity = Number.isInteger(minCapacityParam) && minCapacityParam >= 0 ? minCapacityParam : 0;
  const sort = isVenueSort(sortParam) ? sortParam : "name";
  const sortDirection = isVenueSortDirection(sortDirectionParam) ? sortDirectionParam : "asc";

  const activeFilterCount = Number(Boolean(searchKeyword)) + selectedRegions.length + (minCapacity > 0 ? 1 : 0);

  useEffect(() => {
    const syncInputValue = () => {
      setSearchValue(searchKeyword);
    };
    syncInputValue();
  }, [searchKeyword]);

  const toggleMobileFilter = () => setIsMobileFilterOpen((isOpen) => !isOpen);

  const updateSearchParams = useCallback(
    (update: (params: URLSearchParams) => void) => {
      setSearchParams(
        (currentParams) => {
          const nextParams = new URLSearchParams(currentParams);
          update(nextParams);
          return nextParams;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  const changeKeyword = (value: string) => {
    updateSearchParams((params) => {
      if (value) params.set(VENUE_LIST_FILTER_KEYS.keyword, value);
      else params.delete(VENUE_LIST_FILTER_KEYS.keyword);
    });
  };

  const toggleRegion = (region: string) => {
    updateSearchParams((params) => {
      const regions = params.getAll(VENUE_LIST_FILTER_KEYS.region);
      params.delete(VENUE_LIST_FILTER_KEYS.region);
      regions.filter((value) => value !== region).forEach((value) => params.append(VENUE_LIST_FILTER_KEYS.region, value));
      if (!regions.includes(region)) params.append(VENUE_LIST_FILTER_KEYS.region, region);
    });
  };

  const changeMinCapacity = (value: number) => {
    updateSearchParams((params) => {
      if (Number.isInteger(value) && value > 0) params.set(VENUE_LIST_FILTER_KEYS.minCapacity, value.toString());
      else params.delete(VENUE_LIST_FILTER_KEYS.minCapacity);
    });
  };

  const changeSort = (value: VenueSort) => {
    updateSearchParams((params) => {
      if (value === "name") params.delete(VENUE_LIST_FILTER_KEYS.sort);
      else params.set(VENUE_LIST_FILTER_KEYS.sort, value);
    });
  };

  const changeSortDirection = (value: VenueSortDirection) => {
    updateSearchParams((params) => {
      if (value === "asc") params.delete(VENUE_LIST_FILTER_KEYS.direction);
      else params.set(VENUE_LIST_FILTER_KEYS.direction, value);
    });
  };

  const clearFilters = () => {
    updateSearchParams((params) => {
      params.delete(VENUE_LIST_FILTER_KEYS.keyword);
      params.delete(VENUE_LIST_FILTER_KEYS.region);
      params.delete(VENUE_LIST_FILTER_KEYS.minCapacity);
    });
  };

  const handleSearchInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setSearchValue(value);
    changeKeyword(value);
  };

  return {
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
  };
};
