import { type Dispatch, type SetStateAction, useEffect, useRef } from "react";

import type { BeginCheckoutReviewMessageData } from "@tikkle/api-types";

import type { VenueSeatResponse, VenueSeatState } from "@entities/venue";

import { useCheckoutReview } from "@features/performance-booking";

import type { PerformanceSeatRequestIds, SeatOperationState } from "./seat-map.types";
import { usePerformanceSeatActions } from "./use-performance-seat-actions";
import { usePerformanceSeatAvailability } from "./use-performance-seat-availability";
import { usePerformanceSeatSubscriptions } from "./use-performance-seat-subscriptions";

interface UsePerformanceSeatHoldPanelProps {
  performanceId: number;
  venueSeats: VenueSeatResponse[];
  venueSeatStates: Map<number, VenueSeatState>;
  selectedSeatIds: Set<number>;
  seatOperationState: SeatOperationState;
  setVenueSeatStates: Dispatch<SetStateAction<Map<number, VenueSeatState>>>;
  setSelectedSeatIds: Dispatch<SetStateAction<Set<number>>>;
  setServerTimeOffset: Dispatch<SetStateAction<number>>;
  setSeatOperationState: Dispatch<SetStateAction<SeatOperationState>>;
  onCheckout?: (review: BeginCheckoutReviewMessageData) => void;
}

export const usePerformanceSeatHoldPanel = ({
  performanceId,
  venueSeats,
  venueSeatStates,
  selectedSeatIds,
  seatOperationState,
  setVenueSeatStates,
  setSelectedSeatIds,
  setServerTimeOffset,
  setSeatOperationState,
  onCheckout,
}: UsePerformanceSeatHoldPanelProps) => {
  const performanceSeatRequestIdsRef = useRef<PerformanceSeatRequestIds>({
    seatStatus: null,
    hold: null,
    release: null,
  });

  const {
    myHolds,
    myHeldSeatInfoBySeatId,
    selectedSeatIdsToHold,
    selectedSeatIdsToRelease,
    myHeldSeatTotalPrice,
    venueSeatById,
    setBookedSeatIds,
    setHeldSeatExpiresAtBySeatId,
    setMyHeldSeatInfoBySeatId,
  } = usePerformanceSeatAvailability({
    venueSeats,
    selectedSeatIds,
    venueSeatStates,
    seatOperationStatus: seatOperationState.status,
    setVenueSeatStates,
    setSelectedSeatIds,
  });

  const { isRefreshing, refreshError, visibleSeatOperationState, handleHoldSeats, handleReleaseSeats, handleRefresh, handleRefreshFinish } =
    usePerformanceSeatActions({
      performanceId,
      performanceSeatRequestIdsRef,
      selectedSeatIdsToHold,
      selectedSeatIdsToRelease,
      seatOperationState,
      setSeatOperationState,
    });

  const { isConnected, connectionStyle } = usePerformanceSeatSubscriptions({
    performanceId,
    performanceSeatRequestIdsRef,
    handleRefreshFinish,
    setSelectedSeatIds,
    setServerTimeOffset,
    setSeatOperationState,
    setBookedSeatIds,
    setHeldSeatExpiresAtBySeatId,
    setMyHeldSeatInfoBySeatId,
  });

  const {
    isBeginning: isCheckoutReviewBeginning,
    errorMessage: checkoutReviewErrorMessage,
    beginReview,
  } = useCheckoutReview({
    performanceId,
    onBeginSuccess: onCheckout,
  });

  const handleCheckout = () => {
    if (!onCheckout) return;
    beginReview();
  };

  useEffect(() => {
    if (selectedSeatIdsToHold.length === 0) return;

    const timeoutId = window.setTimeout(() => {
      handleHoldSeats();
    }, 500);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [handleHoldSeats, selectedSeatIdsToHold]);

  return {
    isRefreshing,
    refreshError,
    myHolds,
    myHeldSeatInfoBySeatId,
    selectedSeatIdsToRelease,
    myHeldSeatTotalPrice,
    venueSeatById,
    handleRefresh,
    handleReleaseSeats,
    visibleSeatOperationState,
    isConnected,
    connectionStyle,
    isCheckoutReviewBeginning,
    checkoutReviewErrorMessage,
    handleCheckout,
  };
};
