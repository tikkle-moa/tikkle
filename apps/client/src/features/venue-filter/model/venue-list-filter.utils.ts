import { type VenueListResponse, getVenueRegion } from "@entities/venue";

import { VENUE_LIST_SORT_DIRECTIONS, VENUE_LIST_SORT_OPTIONS } from "./venue-list-filter.constants";
import type { VenueSort, VenueSortDirection } from "./venue-list-filter.types";

export const isVenueSort = (value: string | null): value is VenueSort => {
  return value !== null && Object.hasOwn(VENUE_LIST_SORT_OPTIONS, value);
};

export const isVenueSortDirection = (value: string | null): value is VenueSortDirection => {
  return value !== null && Object.hasOwn(VENUE_LIST_SORT_DIRECTIONS, value);
};

export const filterAndSortVenues = (
  venues: VenueListResponse[],
  searchKeyword: string,
  selectedRegions: string[],
  minCapacity: number,
  sort: VenueSort,
  sortDirection: VenueSortDirection,
) => {
  const normalizedKeyword = searchKeyword.trim().toLocaleLowerCase("ko");
  const direction = sortDirection === "asc" ? 1 : -1;

  return venues
    .filter((venue) => {
      const matchesKeyword = !normalizedKeyword || `${venue.name} ${venue.address}`.toLocaleLowerCase("ko").includes(normalizedKeyword);
      const matchesRegion = selectedRegions.length === 0 || selectedRegions.includes(getVenueRegion(venue.address));
      const matchesMinCapacity = minCapacity <= 0 || venue.venueSeatCount >= minCapacity;
      return matchesKeyword && matchesRegion && matchesMinCapacity;
    })
    .toSorted((a, b) => {
      switch (sort) {
        case "name":
          return direction * a.name.localeCompare(b.name, "ko");
        case "capacity":
          return direction * (a.venueSeatCount - b.venueSeatCount);
        case "region":
          return direction * getVenueRegion(a.address).localeCompare(getVenueRegion(b.address), "ko");
        case "popular":
          return direction * (a.concertCount - b.concertCount);
      }
    });
};
