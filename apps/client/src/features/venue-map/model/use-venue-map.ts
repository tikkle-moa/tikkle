import { useMemo } from "react";

import type { VenueSeatResponse } from "@entities/venue";

import { useVenueMapSelection } from "./use-venue-map-selection";
import { useVenueMapViewport } from "./use-venue-map-viewport";

interface UseVenueMapParams {
  width: number;
  height: number;
  venueSeats?: VenueSeatResponse[];
  trackDragging?: boolean;
  directDragRendering?: boolean;
}

export const useVenueMap = ({ width, height, venueSeats, trackDragging, directDragRendering }: UseVenueMapParams) => {
  const selection = useVenueMapSelection(venueSeats);
  const viewport = useVenueMapViewport({ width, height, trackDragging, directDragRendering });

  return useMemo(() => ({ ...selection, ...viewport }), [selection, viewport]);
};
