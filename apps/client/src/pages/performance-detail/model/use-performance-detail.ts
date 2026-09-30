import { useCallback } from "react";
import { useNavigate, useParams } from "react-router";

import type { BeginCheckoutReviewMessageData } from "@tikkle/api-types";

import { usePerformanceDetail as usePerformanceDetailQuery } from "@entities/performance";
import { useVenueDetail } from "@entities/venue";

import { getPerformanceCheckoutNavigation } from "./performance-detail.utils";

export const usePerformanceDetail = () => {
  const { performanceId } = useParams();
  const navigate = useNavigate();
  const id = Number(performanceId);
  const isParamValid = Number.isInteger(id) && id > 0;

  const performanceQuery = usePerformanceDetailQuery(id);
  const performance = performanceQuery.data;
  const shouldLoadVenue = performance?.status !== "ENDED";
  const venueQuery = useVenueDetail(performance?.venueId ?? 0, shouldLoadVenue);
  const venueDetail = venueQuery.data;
  const handleCheckout = useCallback(
    (review: BeginCheckoutReviewMessageData) => {
      const navigation = getPerformanceCheckoutNavigation({ performance, venueDetail, review });
      if (!navigation) return;

      navigate(navigation.pathname, { state: navigation.state });
    },
    [navigate, performance, venueDetail],
  );

  const isVenuePending = performanceQuery.isSuccess && shouldLoadVenue && venueQuery.isPending;
  const isVenueError = shouldLoadVenue && venueQuery.isError;

  return {
    isParamValid,
    performance,
    venueDetail,
    isError: performanceQuery.isError || isVenueError,
    isPending: performanceQuery.isPending || isVenuePending,
    handleCheckout,
  };
};
