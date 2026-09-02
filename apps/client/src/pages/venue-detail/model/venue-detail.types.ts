import type { VenueResponse, VenueSeatResponse } from "@entities/venue";

export interface VenueDetailPageState {
  isParamValid: boolean;
  venue: VenueResponse | undefined;
  venueSeats: VenueSeatResponse[];
  isPending: boolean;
  isError: boolean;
}
