import { useState } from "react";

import { DEFAULT_MY_RESERVATION_FILTER, MY_RESERVATION_FILTER_OPTIONS } from "./my-reservation-filter.constants";
import type { MyReservationFilterId, MyReservationFilterProps } from "./my-reservation-filter.types";

export const useMyReservationFilter = ({ reservations }: MyReservationFilterProps) => {
  const [selectedFilter, setSelectedFilter] = useState(DEFAULT_MY_RESERVATION_FILTER);
  const selectedFilterOption = MY_RESERVATION_FILTER_OPTIONS.find(({ id }) => id === selectedFilter)!;
  const filterStatuses = selectedFilterOption.statuses;
  const filteredReservations = filterStatuses === null ? reservations : reservations.filter(({ status }) => filterStatuses.includes(status));

  const handleFilterChange = (filterId: MyReservationFilterId) => setSelectedFilter(filterId);

  return {
    filteredReservations,
    handleFilterChange,
    selectedFilter,
  };
};
