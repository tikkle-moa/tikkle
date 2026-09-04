import type { VenueListFilter, VenueSort, VenueSortDirection } from "./venue-list-filter.types";

export const VENUE_LIST_FILTER_KEYS: Record<VenueListFilter, VenueListFilter> = {
  keyword: "keyword",
  region: "region",
  sort: "sort",
  direction: "direction",
} as const satisfies Record<VenueListFilter, VenueListFilter>;

export const VENUE_LIST_SORT_OPTIONS: Record<VenueSort, string> = {
  name: "이름",
  capacity: "수용 인원",
  region: "지역",
  popular: "인기",
};

export const VENUE_LIST_SORT_DIRECTIONS: Record<VenueSortDirection, string> = {
  asc: "오름차순",
  desc: "내림차순",
};
