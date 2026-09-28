import { type Dispatch, type RefObject, type SetStateAction, useCallback, useMemo, useRef, useState } from "react";

import type StompClient from "@shared/realtime/stomp-client";
import { useStompStore } from "@shared/realtime/stomp.store";

import type { PerformanceSeatRequestIds, SeatOperation, SeatOperationState } from "./seat-map.types";

interface UsePerformanceSeatActionsProps {
  performanceId: number;
  performanceSeatRequestIdsRef: RefObject<PerformanceSeatRequestIds>;
  selectedSeatIdsToHold: number[];
  selectedSeatIdsToRelease: number[];
  seatOperationState: SeatOperationState;
  setSeatOperationState: Dispatch<SetStateAction<SeatOperationState>>;
}

export const usePerformanceSeatActions = ({
  performanceId,
  performanceSeatRequestIdsRef,
  selectedSeatIdsToHold,
  selectedSeatIdsToRelease,
  seatOperationState,
  setSeatOperationState,
}: UsePerformanceSeatActionsProps) => {
  const stompClient = useStompStore((state) => state.stompClient);
  const isConnected = useStompStore((state) => state.connectionStatus === "connected");

  const [isRefreshing, setIsRefreshing] = useState(true);
  const isRefreshingRef = useRef(true);
  const [refreshError, setRefreshError] = useState<string | null>(null);

  const handleRefreshFinish = useCallback((state: SeatOperationState) => {
    if (!isRefreshingRef.current) return;

    if (state.status === "error") {
      setRefreshError(state.message);
      isRefreshingRef.current = false;
      setIsRefreshing(false);
      return;
    }

    setTimeout(() => {
      if (!isRefreshingRef.current) return;
      isRefreshingRef.current = false;
      setIsRefreshing(false);
    }, 500);
  }, []);

  const validateSeatHoldAction = useCallback(
    (stompClient: StompClient | null, action?: SeatOperation): stompClient is StompClient => {
      if (!action && isRefreshingRef.current) return false;
      if ((action === "hold" && selectedSeatIdsToHold.length === 0) || (action === "release" && selectedSeatIdsToRelease.length === 0)) {
        setSeatOperationState({ status: "error", message: `${action === "hold" ? "점유" : "해제"}할 좌석을 먼저 선택해 주세요.` });
        return false;
      }
      if (!isConnected || !stompClient) {
        setSeatOperationState({ status: "error", message: "실시간 좌석 상태를 확인한 후 다시 시도해 주세요." });
        return false;
      }
      return true;
    },
    [isConnected, selectedSeatIdsToHold.length, selectedSeatIdsToRelease.length, setSeatOperationState],
  );

  const handleRefresh = useCallback(() => {
    if (!validateSeatHoldAction(stompClient)) return;

    setRefreshError(null);
    isRefreshingRef.current = true;
    setIsRefreshing(true);

    const requestId = crypto.randomUUID();
    performanceSeatRequestIdsRef.current.seatStatus = requestId;
    stompClient.publish({
      path: "/performances/{performanceId}/get-seat-status",
      pathParams: { performanceId },
      command: { requestId },
    });
  }, [performanceId, performanceSeatRequestIdsRef, stompClient, validateSeatHoldAction]);

  const handleHoldSeats = useCallback(() => {
    if (!validateSeatHoldAction(stompClient, "hold")) return;

    setSeatOperationState({ status: "loading" });

    const requestId = crypto.randomUUID();
    performanceSeatRequestIdsRef.current.hold = requestId;
    stompClient.publish({
      path: "/performances/{performanceId}/hold-seats",
      pathParams: { performanceId },
      command: { requestId, data: selectedSeatIdsToHold },
    });
  }, [performanceId, performanceSeatRequestIdsRef, selectedSeatIdsToHold, setSeatOperationState, stompClient, validateSeatHoldAction]);

  const handleReleaseSeats = useCallback(() => {
    if (!validateSeatHoldAction(stompClient, "release")) return;

    setSeatOperationState({ status: "loading" });

    const requestId = crypto.randomUUID();
    performanceSeatRequestIdsRef.current.release = requestId;
    stompClient.publish({
      path: "/performances/{performanceId}/release-seats",
      pathParams: { performanceId },
      command: { requestId, data: selectedSeatIdsToRelease },
    });
  }, [performanceId, performanceSeatRequestIdsRef, selectedSeatIdsToRelease, setSeatOperationState, stompClient, validateSeatHoldAction]);

  const visibleSeatOperationState = useMemo(
    () =>
      seatOperationState.status === "loading" && (!isConnected || !stompClient)
        ? {
            status: "error" as const,
            message: "실시간 연결이 끊겼습니다.",
          }
        : seatOperationState,
    [isConnected, seatOperationState, stompClient],
  );

  return {
    isRefreshing,
    refreshError,
    visibleSeatOperationState,
    handleHoldSeats,
    handleReleaseSeats,
    handleRefresh,
    handleRefreshFinish,
  };
};
