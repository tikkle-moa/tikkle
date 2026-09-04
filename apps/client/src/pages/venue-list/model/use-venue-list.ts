import { useMemo } from "react";

import { USER_ROLE, useSessionStore } from "@entities/session";
import { useVenues } from "@entities/venue";

import type { VenueSort, VenueSortDirection } from "@features/venue-filter";

import { getRegion } from "./venue-list.utils";

interface UseVenueListProps {
  searchKeyword: string;
  selectedRegions: string[];
  sort: VenueSort;
  sortDirection: VenueSortDirection;
}

export const useVenueList = ({ searchKeyword, selectedRegions, sort, sortDirection }: UseVenueListProps) => {
  const isAdmin = useSessionStore((state) => state.user?.role === USER_ROLE.ADMIN);
  const { data: allVenues = [], isPending, isError } = useVenues();

  const allRegions = useMemo(
    () => [...new Set(allVenues.map((venue) => getRegion(venue.address)).filter(Boolean))].sort((a, b) => a.localeCompare(b, "ko")),
    [allVenues],
  );

  const filteredVenues = useMemo(() => {
    const normalizedKeyword = searchKeyword.trim().toLocaleLowerCase("ko");

    return allVenues
      .filter((venue) => {
        const matchesKeyword = !normalizedKeyword || `${venue.name} ${venue.address}`.toLocaleLowerCase("ko").includes(normalizedKeyword);
        const matchesRegion = selectedRegions.length === 0 || selectedRegions.includes(getRegion(venue.address));
        return matchesKeyword && matchesRegion;
      })
      .toSorted((a, b) => {
        const dir = sortDirection === "asc" ? 1 : -1;
        switch (sort) {
          case "name":
            return dir * a.name.localeCompare(b.name, "ko");
          case "capacity":
            return dir * (a.venueSeatCount - b.venueSeatCount);
          case "region":
            return dir * getRegion(a.address).localeCompare(getRegion(b.address), "ko");
          case "popular":
            return dir * (a.concertCount - b.concertCount);
        }
      });
  }, [allVenues, searchKeyword, selectedRegions, sort, sortDirection]);

  return {
    isAdmin,
    filteredVenues,
    allRegions,
    isPending,
    isError,
  };
};
