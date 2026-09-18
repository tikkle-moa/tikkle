export const VENUE_SEAT_WIDTH = 4.5;
export const VENUE_SEAT_HEIGHT = 3.5;
export const VENUE_SEAT_RADIUS = 1;

export const VENUE_QUERY_KEYS = {
  all: ["venues"] as const,
  detail: (venueId: number) => [...VENUE_QUERY_KEYS.all, "detail", venueId] as const,
};
