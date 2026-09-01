import { useParams } from "react-router";

import { usePerformanceDetail as usePerformanceDetailQuery } from "@entities/performance";
import { useVenueDetail } from "@entities/venue";

export const usePerformanceDetail = () => {
  const { performanceId } = useParams();
  const id = Number(performanceId);
  const isParamValid = Number.isInteger(id) && id > 0;

  const performanceQuery = usePerformanceDetailQuery(id);
  const performance = performanceQuery.data;
  const shouldLoadVenue = performance?.status !== "ENDED";
  const venueQuery = useVenueDetail(performance?.venueId ?? 0, shouldLoadVenue);

  const isVenuePending = performanceQuery.isSuccess && shouldLoadVenue && venueQuery.isPending;
  const isVenueError = shouldLoadVenue && venueQuery.isError;

  return {
    isParamValid,
    performance,
    venue: venueQuery.data?.venue,
    seats: venueQuery.data?.venueSeats ?? [],
    isError: performanceQuery.isError || isVenueError,
    isPending: performanceQuery.isPending || isVenuePending,
  };
};
