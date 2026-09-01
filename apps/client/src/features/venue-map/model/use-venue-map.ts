import type { VenueSeatResponse } from "@entities/venue";

import { useVenueMapSelection } from "./use-venue-map-selection";
import { useVenueMapViewport } from "./use-venue-map-viewport";

interface UseVenueMapParams {
  width: number;
  height: number;
  seats?: VenueSeatResponse[];
}

export const useVenueMap = ({ width, height, seats }: UseVenueMapParams) => ({
  ...useVenueMapSelection(seats),
  ...useVenueMapViewport({ width, height }),
});
