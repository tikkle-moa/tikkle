import { VENUE_LIST_SORT_DIRECTIONS, VENUE_LIST_SORT_OPTIONS } from "./venue-list-filter.constants";
import type { VenueSort, VenueSortDirection } from "./venue-list-filter.types";

export const isVenueSort = (value: string | null): value is VenueSort => {
  return value !== null && Object.hasOwn(VENUE_LIST_SORT_OPTIONS, value);
};

export const isVenueSortDirection = (value: string | null): value is VenueSortDirection => {
  return value !== null && Object.hasOwn(VENUE_LIST_SORT_DIRECTIONS, value);
};
