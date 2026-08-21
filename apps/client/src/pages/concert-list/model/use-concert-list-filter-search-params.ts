import { useCallback } from "react";
import { useSearchParams } from "react-router";

import { CONCERT_FILTER_QUERY_KEYS, type ConcertFilterQueryKey } from "@features/concert-filter";

export const useConcertListFilterSearchParams = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const selectedGenres = searchParams.getAll(CONCERT_FILTER_QUERY_KEYS.genre);
  const selectedBookingStatuses = searchParams.getAll(CONCERT_FILTER_QUERY_KEYS.status);
  const startDate = searchParams.get(CONCERT_FILTER_QUERY_KEYS.dateFrom) ?? "";
  const endDate = searchParams.get(CONCERT_FILTER_QUERY_KEYS.dateTo) ?? "";

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

  const toggleSearchParam = useCallback(
    (key: ConcertFilterQueryKey, value: string) => {
      updateSearchParams((params) => {
        const values = params.getAll(key);
        const isSelected = values.includes(value);

        params.delete(key);

        values.filter((currentValue) => currentValue !== value).forEach((currentValue) => params.append(key, currentValue));

        if (!isSelected) {
          params.append(key, value);
        }
      });
    },
    [updateSearchParams],
  );

  const setSingleSearchParam = useCallback(
    (key: ConcertFilterQueryKey, value: string) => {
      updateSearchParams((params) => {
        params.delete(key);

        if (value) {
          params.set(key, value);
        }
      });
    },
    [updateSearchParams],
  );

  const toggleGenre = (genre: string) => {
    toggleSearchParam(CONCERT_FILTER_QUERY_KEYS.genre, genre);
  };

  const toggleBookingStatus = (status: string) => {
    toggleSearchParam(CONCERT_FILTER_QUERY_KEYS.status, status);
  };

  const changeStartDate = (date: string) => {
    setSingleSearchParam(CONCERT_FILTER_QUERY_KEYS.dateFrom, date);
  };

  const changeEndDate = (date: string) => {
    setSingleSearchParam(CONCERT_FILTER_QUERY_KEYS.dateTo, date);
  };

  const clearFilters = () => {
    updateSearchParams((params) => {
      Object.values(CONCERT_FILTER_QUERY_KEYS).forEach((key) => params.delete(key));
    });
  };

  const activeFilterCount = selectedGenres.length + selectedBookingStatuses.length + Number(Boolean(startDate || endDate));

  return {
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
  };
};
