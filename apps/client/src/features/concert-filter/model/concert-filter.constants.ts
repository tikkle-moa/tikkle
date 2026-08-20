import type { ConcertFilterQueryKey } from "./concert-filter.types";

export const CONCERT_FILTER_QUERY_KEYS = {
  genre: "genre",
  status: "status",
  dateFrom: "dateFrom",
  dateTo: "dateTo",
} as const satisfies Record<ConcertFilterQueryKey, ConcertFilterQueryKey>;
