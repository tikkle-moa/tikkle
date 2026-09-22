import { generatePath } from "react-router";

import type { BeginCheckoutReviewMessageData } from "@tikkle/api-types";

import { ROUTE_PATHS } from "@shared/config/router.config";

import type { PerformanceResponse } from "@entities/performance";
import type { VenueDetailResponse } from "@entities/venue";

interface PerformanceCheckoutNavigationProps {
  performance?: PerformanceResponse;
  venueDetail?: VenueDetailResponse;
  review: BeginCheckoutReviewMessageData;
}

export const getPerformanceCheckoutNavigation = ({ performance, venueDetail, review }: PerformanceCheckoutNavigationProps) => {
  if (!performance || !venueDetail) return null;

  return {
    pathname: generatePath(ROUTE_PATHS.PERFORMANCE_CHECKOUT, { performanceId: String(performance.id) }),
    state: { performance, venue: venueDetail.venue, venueSeats: venueDetail.venueSeats, review },
  };
};
