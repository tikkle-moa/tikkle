import type { BeginCheckoutReviewMessageData, StartCheckoutMessage, StompFailureMessage } from "@tikkle/api-types";

import type { PerformanceResponse } from "@entities/performance";
import type { VenueResponse, VenueSeatResponse } from "@entities/venue";

export interface PerformanceCheckoutLocationState {
  performance: PerformanceResponse;
  venue: VenueResponse;
  venueSeats: VenueSeatResponse[];
  review: BeginCheckoutReviewMessageData;
}

export type BookingMessage = StartCheckoutMessage | StompFailureMessage;
