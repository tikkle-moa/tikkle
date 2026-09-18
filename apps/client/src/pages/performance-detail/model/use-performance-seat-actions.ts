import { type Dispatch, type SetStateAction, useCallback, useEffect, useMemo, useRef, useState } from "react";

import type StompClient from "@shared/realtime/stomp-client";
import { useStompStore } from "@shared/realtime/stomp.store";

import type { RefreshAction, SeatOperation, SeatOperationState } from "./seat-map.types";

interface UsePerformanceSeatActionsProps {
  performanceId: number;
  selectedSeatIdsToHold: number[];
  selectedSeatIdsToRelease: number[];
  seatOperationState: SeatOperationState;
  setSeatOperationState: Dispatch<SetStateAction<SeatOperationState>>;
}

export const usePerformanceSeatActions = ({
  performanceId,
  selectedSeatIdsToHold,
  selectedSeatIdsToRelease,
  seatOperationState,
  setSeatOperationState,
}: UsePerformanceSeatActionsProps) => {
  const stompClient = useStompStore((state) => state.stompClient);
  const isConnected = useStompStore((state) => state.connectionStatus === "connected");

  const [isRefreshing, setIsRefreshing] = useState(false);
  const refreshStateRef = useRef<Record<RefreshAction, boolean>>({ seatStatus: false, myHeldSeats: false });
  const isRefreshingRef = useRef(false);
  useEffect(() => {
    isRefreshingRef.current = isRefreshing;
  }, [isRefreshing]);

  const handleRefreshFinish = useCallback((action: RefreshAction) => {
    if (!isRefreshingRef.current) return;
    refreshStateRef.current[action] = true;
    if (refreshStateRef.current.seatStatus && refreshStateRef.current.myHeldSeats) {
      isRefreshingRef.current = false;
      setTimeout(() => setIsRefreshing(false), 500);
    }
  }, []);

  const validateSeatHoldAction = useCallback(
    (stompClient: StompClient | null, action?: SeatOperation): stompClient is StompClient => {
      if (!action && isRefreshing) return false;
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
    [isConnected, isRefreshing, selectedSeatIdsToHold.length, selectedSeatIdsToRelease.length, setSeatOperationState],
  );

  const handleRefresh = useCallback(() => {
    if (!validateSeatHoldAction(stompClient)) return;

    refreshStateRef.current = { seatStatus: false, myHeldSeats: false };
    isRefreshingRef.current = true;
    setIsRefreshing(true);

    stompClient.publish({
      path: "/performances/{performanceId}/get-seat-status",
      pathParams: { performanceId },
      command: { requestId: crypto.randomUUID() },
    });

    stompClient.publish({
      path: "/performances/{performanceId}/get-my-group-holds",
      pathParams: { performanceId },
      command: { requestId: crypto.randomUUID() },
    });
  }, [performanceId, stompClient, validateSeatHoldAction]);

  const handleHoldSeats = useCallback(() => {
    if (!validateSeatHoldAction(stompClient)) return;

    setSeatOperationState({ status: "loading" });

    stompClient.publish({
      path: "/performances/{performanceId}/hold-seats",
      pathParams: { performanceId },
      command: { requestId: crypto.randomUUID(), data: selectedSeatIdsToHold },
    });
  }, [performanceId, selectedSeatIdsToHold, setSeatOperationState, stompClient, validateSeatHoldAction]);

  const handleReleaseSeats = useCallback(() => {
    if (!validateSeatHoldAction(stompClient)) return;

    setSeatOperationState({ status: "loading" });

    stompClient.publish({
      path: "/performances/{performanceId}/release-seats",
      pathParams: { performanceId },
      command: { requestId: crypto.randomUUID(), data: selectedSeatIdsToRelease },
    });
  }, [performanceId, selectedSeatIdsToRelease, setSeatOperationState, stompClient, validateSeatHoldAction]);

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
    visibleSeatOperationState,
    handleHoldSeats,
    handleReleaseSeats,
    handleRefresh,
    handleRefreshFinish,
  };
};
