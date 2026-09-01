import { useVenueMapSelection } from "./use-venue-map-selection";
import { useVenueMapViewport } from "./use-venue-map-viewport";

interface UseVenueMapParams {
  width: number;
  height: number;
}

export const useVenueMap = ({ width, height }: UseVenueMapParams) => ({
  ...useVenueMapSelection(),
  ...useVenueMapViewport({ width, height }),
});
