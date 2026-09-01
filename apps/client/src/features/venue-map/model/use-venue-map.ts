import type { VenueSeatResponse } from "@entities/venue";

import { useVenueMapSelection } from "./use-venue-map-selection";
import { useVenueMapViewport } from "./use-venue-map-viewport";

interface UseVenueMapParams {
  width: number;
  height: number;
  venueSeats?: VenueSeatResponse[];
}

export const useVenueMap = ({ width, height, venueSeats }: UseVenueMapParams) => ({
  ...useVenueMapSelection(venueSeats),
  ...useVenueMapViewport({ width, height }),
});
