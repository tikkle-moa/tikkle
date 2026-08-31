import { useParams } from "react-router";

import { usePerformanceDetail as usePerformanceDetailQuery } from "@entities/performance";
import { useVenueDetail } from "@entities/venue";

export const usePerformanceDetail = () => {
  const { performanceId } = useParams();
  const id = Number(performanceId);
  const isParamValid = Number.isInteger(id) && id > 0;

  const performanceQuery = usePerformanceDetailQuery(id);
  const venueQuery = useVenueDetail(performanceQuery.data?.venueId ?? 0);

  const isVenuePending = performanceQuery.isSuccess && venueQuery.isPending;

  return {
    isParamValid,
    performance: performanceQuery.data,
    venue: venueQuery.data?.venue,
    seats: venueQuery.data?.venueSeats ?? [],
    isError: performanceQuery.isError || venueQuery.isError,
    isPending: performanceQuery.isPending || isVenuePending,
  };
};
