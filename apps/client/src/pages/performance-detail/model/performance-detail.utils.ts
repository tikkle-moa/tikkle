import { generatePath } from "react-router";

import { ROUTE_PATHS } from "@shared/config/router.config";

import type { PerformanceCheckoutNavigationParams } from "./performance-detail.types";

export const getPerformanceCheckoutNavigation = ({ performance, venueDetail, review }: PerformanceCheckoutNavigationParams) => {
  if (!performance || !venueDetail) return null;

  return {
    pathname: generatePath(ROUTE_PATHS.PERFORMANCE_CHECKOUT, { performanceId: String(performance.id) }),
    state: { performance, venue: venueDetail.venue, venueSeats: venueDetail.venueSeats, review },
  };
};
