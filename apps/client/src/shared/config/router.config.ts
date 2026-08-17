export const ROUTE_PATHS = {
  HOME: "/",
  LOGIN: "/login",
  CONCERTS: "/concerts",
  SEARCH: "/search",
  MY: "/my",
  MY_FAVORITES: "/my/favorites",
  MY_RESERVATIONS: "/my/reservations",
} as const;

export type RoutePaths = (typeof ROUTE_PATHS)[keyof typeof ROUTE_PATHS];

export const AUTH_GUARD_PATHS: RoutePaths[] = [ROUTE_PATHS.MY_FAVORITES, ROUTE_PATHS.MY_RESERVATIONS];
