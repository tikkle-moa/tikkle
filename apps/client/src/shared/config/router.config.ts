export const ROUTE_PATHS = {
  HOME: "/",
  LOGIN: "/login",
  CONCERT_LIST: "/concerts",
  CONCERT_DETAIL: "/concerts/:concertId",
  CONCERT_NEW: "/concerts/new",
  CONCERT_EDIT: "/concerts/:concertId/edit",
  PERFORMANCE_DETAIL: "/performances/:performanceId",
  PERFORMANCE_NEW: "/concerts/:concertId/performances/new",
  VENUE_DETAIL: "/venues/:venueId",
  SEARCH: "/search",
  MY: "/my",
  MY_FAVORITES: "/my/favorites",
  MY_RESERVATIONS: "/my/reservations",
} as const;

export type RoutePaths = (typeof ROUTE_PATHS)[keyof typeof ROUTE_PATHS];

export const AUTH_GUARD_PATHS: RoutePaths[] = [ROUTE_PATHS.MY_FAVORITES, ROUTE_PATHS.MY_RESERVATIONS];
export const ADMIN_GUARD_PATHS: RoutePaths[] = [ROUTE_PATHS.CONCERT_NEW, ROUTE_PATHS.CONCERT_EDIT, ROUTE_PATHS.PERFORMANCE_NEW];
export const GUARDED_PATHS = [...AUTH_GUARD_PATHS, ...ADMIN_GUARD_PATHS];
