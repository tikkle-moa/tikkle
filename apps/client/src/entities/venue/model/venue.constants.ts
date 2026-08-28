export const VENUE_QUERY_KEYS = {
  all: ["venues"] as const,
  detail: (venueId: number) => [...VENUE_QUERY_KEYS.all, "detail", venueId] as const,
};
