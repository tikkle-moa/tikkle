import { type Dispatch, type RefObject, type SetStateAction, useEffect, useMemo, useRef } from "react";

import { useStompStore } from "@shared/realtime/stomp.store";

import type { MyHeldSeatInfo, PerformanceSeatRequestIds, SeatOperationState } from "./seat-map.types";
import { getConnectionStyle } from "./seat-map.utils";

interface UsePerformanceSeatSubscriptionsProps {
  performanceId: number;
  performanceSeatRequestIdsRef: RefObject<PerformanceSeatRequestIds>;
  handleRefreshFinish: (state: SeatOperationState) => void;
  setSelectedSeatIds: Dispatch<SetStateAction<Set<number>>>;
  setServerTimeOffset: Dispatch<SetStateAction<number>>;
  setSeatOperationState: Dispatch<SetStateAction<SeatOperationState>>;
  setBookedSeatIds: Dispatch<SetStateAction<Set<number>>>;
  setHeldSeatExpiresAtBySeatId: Dispatch<SetStateAction<Map<number, Date>>>;
  setMyHeldSeatInfoBySeatId: Dispatch<SetStateAction<Map<number, MyHeldSeatInfo>>>;
}

export const usePerformanceSeatSubscriptions = ({
  performanceId,
  performanceSeatRequestIdsRef,
  handleRefreshFinish,
  setSelectedSeatIds,
  setServerTimeOffset,
  setSeatOperationState,
  setBookedSeatIds,
  setHeldSeatExpiresAtBySeatId,
  setMyHeldSeatInfoBySeatId,
}: UsePerformanceSeatSubscriptionsProps) => {
  const stompClient = useStompStore((state) => state.stompClient);
  const getStompClient = useStompStore((state) => state.getStompClient);
  const isConnected = useStompStore((state) => state.connectionStatus === "connected");
  const connectionStyle = useMemo(() => getConnectionStyle(isConnected), [isConnected]);
  const latestSeatVersionRef = useRef<number | null>(null);
  const requiredSeatVersionRef = useRef<number | null>(null);
  const hasSeatStatusRef = useRef(false);

  useEffect(() => {
    latestSeatVersionRef.current = null;
    requiredSeatVersionRef.current = null;
    hasSeatStatusRef.current = false;
    performanceSeatRequestIdsRef.current.seatStatus = null;
    performanceSeatRequestIdsRef.current.hold = null;
    performanceSeatRequestIdsRef.current.release = null;
  }, [performanceId, performanceSeatRequestIdsRef]);

  useEffect(() => {
    if (isConnected) return;
    getStompClient();
  }, [isConnected, getStompClient]);

  useEffect(() => {
    if (!isConnected || !stompClient) return;

    const requestSeatStatus = () => {
      const requestId = crypto.randomUUID();
      performanceSeatRequestIdsRef.current.seatStatus = requestId;
      stompClient.publish({
        path: "/performances/{performanceId}/get-seat-status",
        pathParams: { performanceId },
        command: { requestId },
      });
    };

    const seatStatusSubscription = stompClient.subscribe({
      path: "/performances/{performanceId}/get-seat-status",
      pathParams: { performanceId },
      callback: (message) => {
        if (message.requestId !== performanceSeatRequestIdsRef.current.seatStatus) return;
        const latestVersion = latestSeatVersionRef.current;
        const requiredVersion = requiredSeatVersionRef.current;
        if (requiredVersion !== null && message.data.version < requiredVersion) {
          requestSeatStatus();
          return;
        }
        if (latestVersion !== null && message.data.version < latestVersion) {
          requiredSeatVersionRef.current = latestVersion;
          requestSeatStatus();
          return;
        }

        latestSeatVersionRef.current = message.data.version;
        requiredSeatVersionRef.current = null;
        hasSeatStatusRef.current = true;
        const serverTime = Date.parse(message.data.serverTime);
        if (Number.isFinite(serverTime)) setServerTimeOffset(serverTime - Date.now());
        setBookedSeatIds(new Set(message.data.bookedSeatIds));
        setHeldSeatExpiresAtBySeatId(new Map(message.data.otherHoldSeats.map(({ id, expiresAt }) => [id, new Date(expiresAt)])));
        setMyHeldSeatInfoBySeatId(
          new Map(
            message.data.myHolds.flatMap(({ holdId, expiresAt, venueSeatIds }) =>
              venueSeatIds.map((venueSeatId) => [venueSeatId, { holdId, expiresAt: new Date(expiresAt) }]),
            ),
          ),
        );

        handleRefreshFinish({ status: "success" });
      },
      errorCallback: (errorMessage) => {
        if (errorMessage.requestId !== performanceSeatRequestIdsRef.current.seatStatus) return;
        handleRefreshFinish({ status: "error", message: errorMessage.error.message });
      },
    });

    const seatEventSubscription = stompClient.subscribeEvent({
      path: "/performances/{performanceId}/seat-events",
      pathParams: { performanceId },
      callback: (event) => {
        const latestVersion = latestSeatVersionRef.current;
        if (!hasSeatStatusRef.current || latestVersion === null) {
          requiredSeatVersionRef.current = Math.max(requiredSeatVersionRef.current ?? -1, event.version);
          requestSeatStatus();
          return;
        }
        if (event.version <= latestVersion) return;
        if (event.version !== latestVersion + 1) {
          requiredSeatVersionRef.current = event.version;
          requestSeatStatus();
          return;
        }

        latestSeatVersionRef.current = event.version;

        switch (event.type) {
          case "HELD_SEATS": {
            setHeldSeatExpiresAtBySeatId((current) => {
              if (event.data.length === 0) return current;
              const updated = new Map(current);
              event.data.forEach(({ id, expiresAt }) => updated.set(id, new Date(expiresAt)));
              return updated;
            });
            break;
          }
          case "RELEASED_SEATS": {
            setHeldSeatExpiresAtBySeatId((current) => {
              const updated = new Map(current);
              event.data.forEach((seatId) => updated.delete(seatId));
              return current.size === updated.size ? current : updated;
            });
            setMyHeldSeatInfoBySeatId((current) => {
              const updated = new Map(current);
              event.data.forEach((seatId) => updated.delete(seatId));
              return current.size === updated.size ? current : updated;
            });
            setSelectedSeatIds((current) => {
              const updated = new Set(current);
              event.data.forEach((seatId) => updated.delete(seatId));
              return current.size === updated.size ? current : updated;
            });
            break;
          }
          case "RESERVATION_CONFIRMED": {
            setHeldSeatExpiresAtBySeatId((current) => {
              const updated = new Map(current);
              event.data.forEach((seatId) => updated.delete(seatId));
              return current.size === updated.size ? current : updated;
            });
            setMyHeldSeatInfoBySeatId((current) => {
              const updated = new Map(current);
              event.data.forEach((seatId) => updated.delete(seatId));
              return current.size === updated.size ? current : updated;
            });
            setBookedSeatIds((current) => {
              const updated = new Set(current);
              event.data.forEach((seatId) => updated.add(seatId));
              return current.size === updated.size ? current : updated;
            });
            setSelectedSeatIds((current) => {
              const updated = new Set(current);
              event.data.forEach((seatId) => updated.delete(seatId));
              return current.size === updated.size ? current : updated;
            });
            break;
          }
        }
      },
    });

    requestSeatStatus();

    return () => {
      seatStatusSubscription.unsubscribe();
      seatEventSubscription.unsubscribe();
    };
  }, [
    handleRefreshFinish,
    isConnected,
    performanceId,
    performanceSeatRequestIdsRef,
    setBookedSeatIds,
    setMyHeldSeatInfoBySeatId,
    setHeldSeatExpiresAtBySeatId,
    setSelectedSeatIds,
    setServerTimeOffset,
    stompClient,
  ]);

  useEffect(() => {
    if (!isConnected || !stompClient) return;

    const holdSeatsSubscription = stompClient.subscribe({
      path: "/performances/{performanceId}/hold-seats",
      pathParams: { performanceId },
      callback: (message) => {
        if (message.requestId !== performanceSeatRequestIdsRef.current.hold) return;

        setMyHeldSeatInfoBySeatId((current) => {
          const { holdId, venueSeatIds, expiresAt: expiresAtString } = message.data;
          if (venueSeatIds.length === 0) return current;
          const expiresAt = new Date(expiresAtString);
          const updated = new Map(current);
          venueSeatIds.forEach((seatId) => updated.set(seatId, { holdId, expiresAt }));
          return updated;
        });
        setSeatOperationState({ status: "success" });
      },
      errorCallback: (errorMessage) => {
        if (errorMessage.requestId !== performanceSeatRequestIdsRef.current.hold) return;
        setSeatOperationState({ status: "error", message: errorMessage.error.message });
      },
    });

    const releaseSeatsSubscription = stompClient.subscribe({
      path: "/performances/{performanceId}/release-seats",
      pathParams: { performanceId },
      callback: (message) => {
        if (message.requestId !== performanceSeatRequestIdsRef.current.release) return;

        setMyHeldSeatInfoBySeatId((current) => {
          const updated = new Map(current);
          message.data.forEach((seatId) => updated.delete(seatId));
          return current.size === updated.size ? current : updated;
        });
        setSelectedSeatIds((current) => {
          const updated = new Set(current);
          message.data.forEach((seatId) => updated.delete(seatId));
          return current.size === updated.size ? current : updated;
        });
        setSeatOperationState({ status: "success" });
      },
      errorCallback: (errorMessage) => {
        if (errorMessage.requestId !== performanceSeatRequestIdsRef.current.release) return;
        setSeatOperationState({ status: "error", message: errorMessage.error.message });
      },
    });

    return () => {
      holdSeatsSubscription.unsubscribe();
      releaseSeatsSubscription.unsubscribe();
    };
  }, [isConnected, performanceId, performanceSeatRequestIdsRef, setMyHeldSeatInfoBySeatId, setSeatOperationState, setSelectedSeatIds, stompClient]);

  return {
    isConnected,
    connectionStyle,
  };
};
