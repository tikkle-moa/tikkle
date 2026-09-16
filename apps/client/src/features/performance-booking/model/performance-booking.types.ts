import type { StartCheckoutMessage, StompFailureMessage, VenueSeatHoldDetail } from "@tikkle/api-types";

import type { PerformanceResponse } from "@entities/performance";
import type { VenueResponse, VenueSeatResponse } from "@entities/venue";

export interface PerformanceCheckoutLocationState {
  performance: PerformanceResponse;
  venue: VenueResponse;
  venueSeats: VenueSeatResponse[];
  hold: VenueSeatHoldDetail;
}

export type BookingMessage = StartCheckoutMessage | StompFailureMessage;
