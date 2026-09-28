import { useState } from "react";

import { act, renderHook } from "@testing-library/react";

import { useStompStore } from "@shared/realtime/stomp.store";

import type { MyGroupHeldSeatInfo, SeatOperationState } from "@pages/performance-detail/model/seat-map.types";
import { usePerformanceSeatSubscriptions } from "@pages/performance-detail/model/use-performance-seat-subscriptions";

type MessageCallback = (message: { requestId: string; data: never }) => void;
type ErrorCallback = (message: { requestId: string; error: { message: string } }) => void;
type EventCallback = (event: { version: number; type: string; data: never }) => void;
type SubscriptionConfig = {
  path: string;
  callback: MessageCallback;
  errorCallback?: ErrorCallback;
};

const createClient = () => {
  const subscriptions: SubscriptionConfig[] = [];
  let eventCallback: EventCallback | undefined;
  const unsubscribe = vi.fn();
  const client = {
    publish: vi.fn(),
    subscribe: vi.fn((config: SubscriptionConfig) => {
      subscriptions.push(config);
      return { unsubscribe };
    }),
    subscribeEvent: vi.fn((config: { callback: EventCallback }) => {
      eventCallback = config.callback;
      return { unsubscribe };
    }),
  };
  return {
    client,
    subscriptions,
    unsubscribe,
    getEventCallback: () => {
      if (!eventCallback) throw new Error("seat event subscription was not registered");
      return eventCallback;
    },
  };
};

const findSubscription = (subscriptions: SubscriptionConfig[], suffix: string) => {
  const subscription = subscriptions.find(({ path }) => path.endsWith(suffix));
  if (!subscription) throw new Error(`${suffix} subscription was not registered`);
  return subscription;
};

const requestIdRefs = () => ({
  performanceSeatRequestIdsRef: {
    current: {
      seatStatus: null as string | null,
      hold: null as string | null,
      release: null as string | null,
    },
  },
});

describe("usePerformanceSeatSubscriptions", () => {
  beforeEach(() => {
    act(() => useStompStore.setState({ stompClient: null, connectionStatus: "disconnected" }));
  });

  afterEach(() => {
    act(() => useStompStore.setState({ stompClient: null, connectionStatus: "disconnected" }));
  });

  it("연결 전에는 클라이언트 연결을 요청한다", () => {
    const getStompClient = vi.fn();
    act(() => useStompStore.setState({ getStompClient }));
    const { result } = renderHook(() =>
      usePerformanceSeatSubscriptions({
        performanceId: 10,
        ...requestIdRefs(),
        handleRefreshFinish: vi.fn(),
        setSelectedSeatIds: vi.fn(),
        setServerTimeOffset: vi.fn(),
        setSeatOperationState: vi.fn(),
        setBookedSeatIds: vi.fn(),
        setHeldSeatExpiresAtBySeatId: vi.fn(),
        setMyGroupHeldSeatInfoBySeatId: vi.fn(),
      }),
    );

    expect(getStompClient).toHaveBeenCalledOnce();
    expect(result.current.isConnected).toBe(false);
    expect(result.current.connectionStyle.label).toBe("연결 중");
  });

  it("초기 상태와 실시간 좌석 이벤트를 반영하고 구독을 정리한다", () => {
    const { client, subscriptions, unsubscribe, getEventCallback } = createClient();
    act(() => useStompStore.setState({ stompClient: client as never, connectionStatus: "connected" }));
    const handleRefreshFinish = vi.fn();
    const requestRefs = requestIdRefs();
    const { result, unmount } = renderHook(() => {
      const [selectedSeatIds, setSelectedSeatIds] = useState(new Set([1, 2]));
      const [serverTimeOffset, setServerTimeOffset] = useState(0);
      const [seatOperationState, setSeatOperationState] = useState<SeatOperationState>({ status: "idle" });
      const [bookedSeatIds, setBookedSeatIds] = useState(new Set<number>());
      const [heldSeatExpiresAtBySeatId, setHeldSeatExpiresAtBySeatId] = useState(new Map<number, Date>());
      const [myGroupHeldSeatInfoBySeatId, setMyGroupHeldSeatInfoBySeatId] = useState(new Map<number, MyGroupHeldSeatInfo>());
      const subscription = usePerformanceSeatSubscriptions({
        performanceId: 10,
        ...requestRefs,
        handleRefreshFinish,
        setSelectedSeatIds,
        setServerTimeOffset,
        setSeatOperationState,
        setBookedSeatIds,
        setHeldSeatExpiresAtBySeatId,
        setMyGroupHeldSeatInfoBySeatId,
      });
      return {
        ...subscription,
        selectedSeatIds,
        serverTimeOffset,
        seatOperationState,
        bookedSeatIds,
        heldSeatExpiresAtBySeatId,
        myGroupHeldSeatInfoBySeatId,
      };
    });

    expect(result.current.isConnected).toBe(true);
    expect(result.current.connectionStyle.label).toBe("실시간 연결됨");
    expect(client.publish).toHaveBeenCalledTimes(1);

    const seatStatus = findSubscription(subscriptions, "get-seat-status");
    const seatStatusRequestId = client.publish.mock.calls[0][0].command.requestId;
    act(() =>
      seatStatus.callback({
        requestId: seatStatusRequestId,
        data: {
          serverTime: new Date(Date.now() + 1000).toISOString(),
          bookedSeatIds: [2],
          version: 1,
          otherGroupHoldSeats: [{ id: 1, expiresAt: "2026-09-16T20:00:00" }],
          myGroupHolds: [{ holdId: "hold-1", expiresAt: "2026-09-16T20:00:00", venueSeatIds: [1, 2] }],
        } as never,
      }),
    );
    expect(result.current.bookedSeatIds).toEqual(new Set([2]));
    expect(result.current.heldSeatExpiresAtBySeatId.get(1)).toEqual(new Date("2026-09-16T20:00:00"));
    expect(result.current.serverTimeOffset).toBeGreaterThan(0);
    expect(handleRefreshFinish).toHaveBeenCalledWith({ status: "success" });
    act(() =>
      seatStatus.callback({
        requestId: seatStatusRequestId,
        data: {
          serverTime: "invalid",
          bookedSeatIds: [2],
          version: 1,
          otherGroupHoldSeats: [{ id: 1, expiresAt: "2026-09-16T20:00:00" }],
          myGroupHolds: [{ holdId: "hold-1", expiresAt: "2026-09-16T20:00:00", venueSeatIds: [1, 2] }],
        } as never,
      }),
    );
    act(() => seatStatus.errorCallback?.({ requestId: "stale-request", error: { message: "오래된 좌석 상태 오류" } }));
    act(() => seatStatus.errorCallback?.({ requestId: seatStatusRequestId, error: { message: "좌석 상태 조회 실패" } }));
    expect(handleRefreshFinish).toHaveBeenCalledWith({
      status: "error",
      message: "좌석 상태 조회 실패",
    });

    act(() =>
      seatStatus.callback({
        requestId: "stale-request",
        data: { serverTime: "invalid", bookedSeatIds: [], version: 0, otherGroupHoldSeats: [], myGroupHolds: [] } as never,
      }),
    );

    act(() =>
      seatStatus.callback({
        requestId: seatStatusRequestId,
        data: { serverTime: "invalid", bookedSeatIds: [], version: 0, otherGroupHoldSeats: [], myGroupHolds: [] } as never,
      }),
    );
    expect(client.publish).toHaveBeenCalledTimes(2);
    expect(result.current.bookedSeatIds).toEqual(new Set([2]));

    expect(result.current.myGroupHeldSeatInfoBySeatId.get(2)?.holdId).toBe("hold-1");

    const event = getEventCallback();
    act(() => event({ version: 1, type: "HELD_SEATS", data: [] as never }));
    const emptyHeldResult = result.current.heldSeatExpiresAtBySeatId;
    act(() =>
      event({
        version: 2,
        type: "HELD_SEATS",
        data: [] as never,
      }),
    );
    expect(result.current.heldSeatExpiresAtBySeatId).toBe(emptyHeldResult);
    act(() =>
      event({
        version: 3,
        type: "HELD_SEATS",
        data: [{ id: 3, expiresAt: "2026-09-16T21:00:00" }] as never,
      }),
    );
    expect(result.current.heldSeatExpiresAtBySeatId).not.toBe(emptyHeldResult);
    expect(result.current.heldSeatExpiresAtBySeatId.has(3)).toBe(true);

    act(() => event({ version: 4, type: "RELEASED_SEATS", data: [99] as never }));
    act(() => event({ version: 5, type: "RELEASED_SEATS", data: [1, 3] as never }));
    expect(result.current.heldSeatExpiresAtBySeatId.has(1)).toBe(false);
    expect(result.current.myGroupHeldSeatInfoBySeatId.has(1)).toBe(false);

    act(() => event({ version: 6, type: "RESERVATION_CONFIRMED", data: [2, 3] as never }));
    expect(result.current.bookedSeatIds).toEqual(new Set([2, 3]));
    expect(result.current.selectedSeatIds).toEqual(new Set([1]));
    act(() => event({ version: 7, type: "RESERVATION_CONFIRMED", data: [2] as never }));
    act(() => event({ version: 9, type: "RESERVATION_CONFIRMED", data: [1] as never }));
    expect(client.publish).toHaveBeenCalledTimes(3);

    const requiredVersionRequestId = client.publish.mock.calls[2][0].command.requestId;
    act(() =>
      seatStatus.callback({
        requestId: requiredVersionRequestId,
        data: { serverTime: "invalid", bookedSeatIds: [], version: 5, otherGroupHoldSeats: [], myGroupHolds: [] } as never,
      }),
    );
    expect(client.publish).toHaveBeenCalledTimes(4);
    expect(result.current.bookedSeatIds).toEqual(new Set([2, 3]));

    unmount();
    expect(unsubscribe).toHaveBeenCalledTimes(4);
  });

  it("초기 좌석 상태 응답 전에 이벤트가 오면 좌석 상태를 다시 조회한다", () => {
    const { client, getEventCallback } = createClient();
    act(() => useStompStore.setState({ stompClient: client as never, connectionStatus: "connected" }));

    renderHook(() =>
      usePerformanceSeatSubscriptions({
        performanceId: 10,
        ...requestIdRefs(),
        handleRefreshFinish: vi.fn(),
        setSelectedSeatIds: vi.fn(),
        setServerTimeOffset: vi.fn(),
        setSeatOperationState: vi.fn(),
        setBookedSeatIds: vi.fn(),
        setHeldSeatExpiresAtBySeatId: vi.fn(),
        setMyGroupHeldSeatInfoBySeatId: vi.fn(),
      }),
    );

    act(() => getEventCallback()({ version: 3, type: "HELD_SEATS", data: [] as never }));

    expect(client.publish).toHaveBeenCalledTimes(2);
    expect(client.publish.mock.calls[1][0].path).toBe("/performances/{performanceId}/get-seat-status");
  });

  it("Hold와 Release 성공 및 실패 응답을 반영한다", () => {
    const { client, subscriptions } = createClient();
    act(() => useStompStore.setState({ stompClient: client as never, connectionStatus: "connected" }));
    const requestRefs = requestIdRefs();
    const { result } = renderHook(() => {
      const [selectedSeatIds, setSelectedSeatIds] = useState(new Set([1, 2]));
      const [seatOperationState, setSeatOperationState] = useState<SeatOperationState>({ status: "idle" });
      const [myGroupHeldSeatInfoBySeatId, setMyGroupHeldSeatInfoBySeatId] = useState(new Map<number, MyGroupHeldSeatInfo>());
      usePerformanceSeatSubscriptions({
        performanceId: 10,
        ...requestRefs,
        handleRefreshFinish: vi.fn(),
        setSelectedSeatIds,
        setServerTimeOffset: vi.fn(),
        setSeatOperationState,
        setBookedSeatIds: vi.fn(),
        setHeldSeatExpiresAtBySeatId: vi.fn(),
        setMyGroupHeldSeatInfoBySeatId,
      });
      return { selectedSeatIds, seatOperationState, myGroupHeldSeatInfoBySeatId };
    });

    const hold = findSubscription(subscriptions, "hold-seats");
    requestRefs.performanceSeatRequestIdsRef.current.hold = "hold-request";
    act(() =>
      hold.callback({
        requestId: "stale-hold-request",
        data: { holdId: "stale-hold", expiresAt: "2026-09-16T20:00:00", venueSeatIds: [1] } as never,
      }),
    );
    expect(result.current.myGroupHeldSeatInfoBySeatId).toEqual(new Map());
    act(() =>
      hold.callback({
        requestId: "hold-request",
        data: { holdId: "hold-1", expiresAt: "2026-09-16T20:00:00", venueSeatIds: [] } as never,
      }),
    );
    expect(result.current.seatOperationState.status).toBe("success");
    act(() =>
      hold.callback({
        requestId: "hold-request",
        data: { holdId: "hold-1", expiresAt: "2026-09-16T20:00:00", venueSeatIds: [1, 2] } as never,
      }),
    );
    expect(result.current.myGroupHeldSeatInfoBySeatId.size).toBe(2);
    act(() => hold.errorCallback?.({ requestId: "stale-hold-request", error: { message: "오래된 Hold 오류" } }));
    act(() => hold.errorCallback?.({ requestId: "hold-request", error: { message: "Hold 실패" } }));
    expect(result.current.seatOperationState).toEqual({ status: "error", message: "Hold 실패" });

    const release = findSubscription(subscriptions, "release-seats");
    requestRefs.performanceSeatRequestIdsRef.current.release = "release-request";
    const beforeRelease = result.current.myGroupHeldSeatInfoBySeatId;
    act(() => release.callback({ requestId: "stale-release-request", data: [1] as never }));
    expect(result.current.myGroupHeldSeatInfoBySeatId).toBe(beforeRelease);
    act(() => release.callback({ requestId: "release-request", data: [99] as never }));
    expect(result.current.myGroupHeldSeatInfoBySeatId).toBe(beforeRelease);
    act(() => release.callback({ requestId: "release-request", data: [1] as never }));
    expect(result.current.myGroupHeldSeatInfoBySeatId.has(1)).toBe(false);
    expect(result.current.selectedSeatIds).toEqual(new Set([2]));
    act(() => release.errorCallback?.({ requestId: "stale-release-request", error: { message: "오래된 Release 오류" } }));
    act(() => release.errorCallback?.({ requestId: "release-request", error: { message: "Release 실패" } }));
    expect(result.current.seatOperationState).toEqual({ status: "error", message: "Release 실패" });
  });
});
