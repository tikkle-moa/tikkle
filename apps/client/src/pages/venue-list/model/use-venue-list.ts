import { useMemo } from "react";

import { USER_ROLE, useSessionStore } from "@entities/session";
import { getVenueRegion, useVenues } from "@entities/venue";

import { type VenueSort, type VenueSortDirection, filterAndSortVenues } from "@features/venue-filter";

interface UseVenueListProps {
  searchKeyword: string;
  selectedRegions: string[];
  minCapacity: number;
  sort: VenueSort;
  sortDirection: VenueSortDirection;
}

export const useVenueList = ({ searchKeyword, selectedRegions, minCapacity, sort, sortDirection }: UseVenueListProps) => {
  const isAdmin = useSessionStore((state) => state.user?.role === USER_ROLE.ADMIN);
  const { data: allVenues = [], isPending, isError } = useVenues();

  const allRegions = useMemo(
    () => [...new Set(allVenues.map((venue) => getVenueRegion(venue.address)).filter(Boolean))].sort((a, b) => a.localeCompare(b, "ko")),
    [allVenues],
  );

  const filteredVenues = useMemo(() => {
    return filterAndSortVenues(allVenues, searchKeyword, selectedRegions, minCapacity, sort, sortDirection);
  }, [allVenues, searchKeyword, selectedRegions, minCapacity, sort, sortDirection]);

  return {
    isAdmin,
    filteredVenues,
    allRegions,
    isPending,
    isError,
  };
};
