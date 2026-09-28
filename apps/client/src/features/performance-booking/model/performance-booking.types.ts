import type { BeginCheckoutReviewMessageData } from "@tikkle/api-types";

import type { PerformanceResponse } from "@entities/performance";
import type { VenueResponse, VenueSeatResponse } from "@entities/venue";

export interface PendingReviewRequest {
  requestId: string;
  reviewToken: string;
  attempts: number;
}

export interface PerformanceCheckoutLocationState {
  performance: PerformanceResponse;
  venue: VenueResponse;
  venueSeats: VenueSeatResponse[];
  review: BeginCheckoutReviewMessageData;
}

export type PerformanceSummary = Pick<PerformanceCheckoutLocationState["performance"], "id" | "venueId" | "name" | "startsAt">;
export type VenueSummary = Pick<PerformanceCheckoutLocationState["venue"], "id" | "name">;
export type VenueSeatSummary = Pick<PerformanceCheckoutLocationState["venueSeats"][number], "id" | "sectionName" | "seatLabel" | "price">;
