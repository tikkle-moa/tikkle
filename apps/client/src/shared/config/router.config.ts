export const ROUTE_PATHS = {
  HOME: "/",
  LOGIN: "/login",
  CONCERTS: "/concerts",
  SEARCH: "/search",
  MY: "/my",
} as const;

export type RoutePaths = (typeof ROUTE_PATHS)[keyof typeof ROUTE_PATHS];

export const AUTH_GUARD_PATHS: RoutePaths[] = [];
