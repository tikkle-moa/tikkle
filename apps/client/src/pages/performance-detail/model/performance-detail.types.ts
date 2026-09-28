import type { BeginCheckoutReviewMessageData } from "@tikkle/api-types";

import type { PerformanceResponse } from "@entities/performance";
import type { VenueDetailResponse } from "@entities/venue";

export interface PerformanceCheckoutNavigationParams {
  performance?: PerformanceResponse;
  venueDetail?: VenueDetailResponse;
  review: BeginCheckoutReviewMessageData;
}
