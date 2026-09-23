import { type Dispatch, type SetStateAction, useEffect } from "react";

import type { VenueSeatResponse, VenueSeatState } from "@entities/venue";

import type { SeatOperationState } from "./seat-map.types";
import { usePerformanceSeatActions } from "./use-performance-seat-actions";
import { usePerformanceSeatAvailability } from "./use-performance-seat-availability";
import { usePerformanceSeatSubscriptions } from "./use-performance-seat-subscriptions";

interface UsePerformanceSeatHoldPanelProps {
  performanceId: number;
  sessionId?: string;
  venueSeats: VenueSeatResponse[];
  venueSeatStates: Map<number, VenueSeatState>;
  selectedSeatIds: Set<number>;
  seatOperationState: SeatOperationState;
  setVenueSeatStates: Dispatch<SetStateAction<Map<number, VenueSeatState>>>;
  setSelectedSeatIds: Dispatch<SetStateAction<Set<number>>>;
  setServerTimeOffset: Dispatch<SetStateAction<number>>;
  setSeatOperationState: Dispatch<SetStateAction<SeatOperationState>>;
}

export const usePerformanceSeatHoldPanel = ({
  performanceId,
  sessionId,
  venueSeats,
  venueSeatStates,
  selectedSeatIds,
  seatOperationState,
  setVenueSeatStates,
  setSelectedSeatIds,
  setServerTimeOffset,
  setSeatOperationState,
}: UsePerformanceSeatHoldPanelProps) => {
  const {
    myGroupHolds,
    myGroupHeldSeatInfoBySeatId,
    selectedSeatIdsToHold,
    selectedSeatIdsToRelease,
    myGroupHeldSeatTotalPrice,
    venueSeatById,
    setBookedSeatIds,
    setHeldSeatExpiresAtBySeatId,
    setMyGroupHeldSeatInfoBySeatId,
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
      sessionId,
      selectedSeatIdsToHold,
      selectedSeatIdsToRelease,
      seatOperationState,
      setSeatOperationState,
    });

  const { isConnected, connectionStyle } = usePerformanceSeatSubscriptions({
    performanceId,
    sessionId,
    handleRefreshFinish,
    setSelectedSeatIds,
    setServerTimeOffset,
    setSeatOperationState,
    setBookedSeatIds,
    setHeldSeatExpiresAtBySeatId,
    setMyGroupHeldSeatInfoBySeatId,
  });

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
    myGroupHolds,
    myGroupHeldSeatInfoBySeatId,
    selectedSeatIdsToRelease,
    myGroupHeldSeatTotalPrice,
    venueSeatById,
    handleRefresh,
    handleReleaseSeats,
    visibleSeatOperationState,
    isConnected,
    connectionStyle,
  };
};
