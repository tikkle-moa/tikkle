import { useSearchParams } from "react-router";

import { DEFAULT_MY_RESERVATION_FILTER, MY_RESERVATION_FILTER_OPTIONS, MY_RESERVATION_FILTER_QUERY_KEY } from "./my-reservation-filter.constants";
import type { MyReservationFilterId, MyReservationFilterProps } from "./my-reservation-filter.types";

export const useMyReservationFilter = ({ reservations }: MyReservationFilterProps) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedFilterOption =
    MY_RESERVATION_FILTER_OPTIONS.find(({ id }) => id === searchParams.get(MY_RESERVATION_FILTER_QUERY_KEY)) ??
    MY_RESERVATION_FILTER_OPTIONS.find(({ id }) => id === DEFAULT_MY_RESERVATION_FILTER)!;
  const selectedFilter = selectedFilterOption.id;
  const filterStatuses = selectedFilterOption.statuses;
  const filteredReservations = filterStatuses === null ? reservations : reservations.filter(({ status }) => filterStatuses.includes(status));

  const handleFilterChange = (filterId: MyReservationFilterId) => {
    setSearchParams(
      (currentParams) => {
        const nextParams = new URLSearchParams(currentParams);

        if (filterId === DEFAULT_MY_RESERVATION_FILTER) {
          nextParams.delete(MY_RESERVATION_FILTER_QUERY_KEY);
        } else {
          nextParams.set(MY_RESERVATION_FILTER_QUERY_KEY, filterId);
        }

        return nextParams;
      },
      { replace: true },
    );
  };

  return {
    filteredReservations,
    handleFilterChange,
    selectedFilter,
  };
};
