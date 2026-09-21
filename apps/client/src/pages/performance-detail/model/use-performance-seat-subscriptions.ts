import { type Dispatch, type SetStateAction, useEffect, useMemo } from "react";

import { useStompStore } from "@shared/realtime/stomp.store";

import type { MyGroupHeldSeatInfo, RefreshAction, SeatOperationState } from "./seat-map.types";
import { getConnectionStyle } from "./seat-map.utils";

interface UsePerformanceSeatSubscriptionsProps {
  performanceId: number;
  handleRefreshFinish: (action: RefreshAction, state: SeatOperationState) => void;
  setSelectedSeatIds: Dispatch<SetStateAction<Set<number>>>;
  setServerTimeOffset: Dispatch<SetStateAction<number>>;
  setSeatOperationState: Dispatch<SetStateAction<SeatOperationState>>;
  setBookedSeatIds: Dispatch<SetStateAction<Set<number>>>;
  setHeldSeatExpiresAtBySeatId: Dispatch<SetStateAction<Map<number, Date>>>;
  setMyGroupHeldSeatInfoBySeatId: Dispatch<SetStateAction<Map<number, MyGroupHeldSeatInfo>>>;
}

export const usePerformanceSeatSubscriptions = ({
  performanceId,
  handleRefreshFinish,
  setSelectedSeatIds,
  setServerTimeOffset,
  setSeatOperationState,
  setBookedSeatIds,
  setHeldSeatExpiresAtBySeatId,
  setMyGroupHeldSeatInfoBySeatId,
}: UsePerformanceSeatSubscriptionsProps) => {
  const stompClient = useStompStore((state) => state.stompClient);
  const getStompClient = useStompStore((state) => state.getStompClient);
  const isConnected = useStompStore((state) => state.connectionStatus === "connected");
  const connectionStyle = useMemo(() => getConnectionStyle(isConnected), [isConnected]);

  useEffect(() => {
    if (isConnected) return;
    getStompClient();
  }, [isConnected, getStompClient]);

  useEffect(() => {
    if (!isConnected || !stompClient) return;

    const seatStatusSubscription = stompClient.subscribe({
      path: "/performances/{performanceId}/get-seat-status",
      pathParams: { performanceId },
      callback: (message) => {
        const serverTime = Date.parse(message.data.serverTime);
        if (Number.isFinite(serverTime)) setServerTimeOffset(serverTime - Date.now());
        setBookedSeatIds(new Set(message.data.bookedSeatIds));
        setHeldSeatExpiresAtBySeatId(new Map(message.data.heldSeats.map(({ id, expiresAt }) => [id, new Date(expiresAt)])));

        handleRefreshFinish("seatStatus", { status: "success" });
      },
      errorCallback: (errorMessage) => {
        handleRefreshFinish("seatStatus", { status: "error", message: errorMessage.error.message });
      },
    });

    stompClient.publish({
      path: "/performances/{performanceId}/get-seat-status",
      pathParams: { performanceId },
      command: { requestId: crypto.randomUUID() },
    });

    const myHeldSeatsSubscription = stompClient.subscribe({
      path: "/performances/{performanceId}/get-my-group-holds",
      pathParams: { performanceId },
      callback: (message) => {
        setMyGroupHeldSeatInfoBySeatId(
          new Map(
            message.data.flatMap(({ groupId, holdId, performanceId, expiresAt, venueSeatIds }) =>
              venueSeatIds.map((venueSeatId) => [venueSeatId, { groupId, holdId, performanceId, expiresAt: new Date(expiresAt) }]),
            ),
          ),
        );

        handleRefreshFinish("myHeldSeats", { status: "success" });
      },
      errorCallback: (errorMessage) => {
        handleRefreshFinish("myHeldSeats", { status: "error", message: errorMessage.error.message });
      },
    });

    stompClient.publish({
      path: "/performances/{performanceId}/get-my-group-holds",
      pathParams: { performanceId },
      command: { requestId: crypto.randomUUID() },
    });

    const seatEventSubscription = stompClient.subscribeEvent({
      path: "/performances/{performanceId}/seat-events",
      pathParams: { performanceId },
      callback: (event) => {
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
            setMyGroupHeldSeatInfoBySeatId((current) => {
              const updated = new Map(current);
              event.data.forEach((seatId) => updated.delete(seatId));
              return current.size === updated.size ? current : updated;
            });
            break;
          }
          case "RESERVATION_CONFIRMED": {
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

    return () => {
      seatStatusSubscription.unsubscribe();
      myHeldSeatsSubscription.unsubscribe();
      seatEventSubscription.unsubscribe();
    };
  }, [
    handleRefreshFinish,
    isConnected,
    performanceId,
    setBookedSeatIds,
    setMyGroupHeldSeatInfoBySeatId,
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
        setMyGroupHeldSeatInfoBySeatId((current) => {
          if (message.data.venueSeatIds.length === 0) return current;
          const { groupId, holdId, performanceId } = message.data;
          const expiresAt = new Date(message.data.expiresAt);
          const updated = new Map(current);
          message.data.venueSeatIds.forEach((seatId) => updated.set(seatId, { groupId, holdId, performanceId, expiresAt }));
          return updated;
        });
        setSeatOperationState({ status: "success" });
      },
      errorCallback: (errorMessage) => {
        setSeatOperationState({ status: "error", message: errorMessage.error.message });
      },
    });

    const releaseSeatsSubscription = stompClient.subscribe({
      path: "/performances/{performanceId}/release-seats",
      pathParams: { performanceId },
      callback: (message) => {
        setMyGroupHeldSeatInfoBySeatId((current) => {
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
        setSeatOperationState({ status: "error", message: errorMessage.error.message });
      },
    });

    return () => {
      holdSeatsSubscription.unsubscribe();
      releaseSeatsSubscription.unsubscribe();
    };
  }, [isConnected, performanceId, setMyGroupHeldSeatInfoBySeatId, setSeatOperationState, setSelectedSeatIds, stompClient]);

  return {
    isConnected,
    connectionStyle,
  };
};
