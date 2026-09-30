import { act, renderHook } from "@testing-library/react";

import { useStompStore } from "@shared/realtime/stomp.store";

import { usePerformanceSeatActions } from "@pages/performance-detail/model/use-performance-seat-actions";

const setConnectedClient = () => {
  const client = { publish: vi.fn() };
  act(() => useStompStore.setState({ stompClient: client as never, connectionStatus: "connected" }));
  return client;
};

const requestIdRefs = () => ({
  sessionId: "session-1",
  performanceSeatRequestIdsRef: {
    current: {
      seatStatus: null as string | null,
      hold: null as string | null,
      release: null as string | null,
    },
  },
});

describe("usePerformanceSeatActions", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    act(() => useStompStore.setState({ stompClient: null, connectionStatus: "disconnected" }));
  });

  afterEach(() => {
    vi.useRealTimers();
    act(() => useStompStore.setState({ stompClient: null, connectionStatus: "disconnected" }));
  });

  it("대상 좌석이 없으면 Hold와 Release 오류를 반환한다", () => {
    const setSeatOperationState = vi.fn();
    const { result } = renderHook(() =>
      usePerformanceSeatActions({
        performanceId: 10,
        ...requestIdRefs(),
        selectedSeatIdsToHold: [],
        selectedSeatIdsToRelease: [],
        seatOperationState: { status: "idle" },
        setSeatOperationState,
      }),
    );

    act(() => {
      result.current.handleRefresh();
      result.current.handleHoldSeats();
      result.current.handleReleaseSeats();
    });

    expect(setSeatOperationState).toHaveBeenNthCalledWith(1, {
      status: "error",
      message: "점유할 좌석을 먼저 선택해 주세요.",
    });
    expect(setSeatOperationState).toHaveBeenNthCalledWith(2, {
      status: "error",
      message: "해제할 좌석을 먼저 선택해 주세요.",
    });
  });

  it("대상 좌석이 있어도 연결되지 않으면 Hold와 Release를 발행하지 않는다", () => {
    const setSeatOperationState = vi.fn();
    const { result } = renderHook(() =>
      usePerformanceSeatActions({
        performanceId: 10,
        ...requestIdRefs(),
        selectedSeatIdsToHold: [1],
        selectedSeatIdsToRelease: [2],
        seatOperationState: { status: "idle" },
        setSeatOperationState,
      }),
    );

    act(() => {
      result.current.handleHoldSeats();
      result.current.handleReleaseSeats();
    });
    expect(setSeatOperationState).toHaveBeenCalledTimes(2);
    expect(setSeatOperationState).toHaveBeenLastCalledWith({
      status: "error",
      message: "실시간 좌석 상태를 확인한 후 다시 시도해 주세요.",
    });
  });

  it("Hold 요청을 발행하고 loading 상태로 전환한다", () => {
    const client = setConnectedClient();
    const setSeatOperationState = vi.fn();
    const { result } = renderHook(() =>
      usePerformanceSeatActions({
        performanceId: 10,
        ...requestIdRefs(),
        selectedSeatIdsToHold: [1, 2],
        selectedSeatIdsToRelease: [3],
        seatOperationState: { status: "idle" },
        setSeatOperationState,
      }),
    );

    act(() => result.current.handleHoldSeats());

    expect(client.publish).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        path: "/performances/{performanceId}/hold-seats",
        pathParams: { performanceId: 10 },
        command: expect.objectContaining({ data: [1, 2], sessionId: "session-1" }),
      }),
    );
    expect(setSeatOperationState).toHaveBeenCalledOnce();
    expect(setSeatOperationState).toHaveBeenCalledWith({ status: "loading" });
  });

  it("Hold 처리 중 재클릭하면 중복 요청을 발행하지 않는다", () => {
    const client = setConnectedClient();
    const setSeatOperationState = vi.fn();
    const { result } = renderHook(() =>
      usePerformanceSeatActions({
        performanceId: 10,
        ...requestIdRefs(),
        selectedSeatIdsToHold: [1, 2],
        selectedSeatIdsToRelease: [],
        seatOperationState: { status: "idle" },
        setSeatOperationState,
      }),
    );

    act(() => {
      result.current.handleHoldSeats();
      result.current.handleHoldSeats();
    });

    expect(client.publish).toHaveBeenCalledOnce();
    expect(setSeatOperationState).toHaveBeenCalledOnce();
  });

  it("Release 처리 중 재클릭하면 중복 요청을 발행하지 않는다", () => {
    const client = setConnectedClient();
    const setSeatOperationState = vi.fn();
    const { result } = renderHook(() =>
      usePerformanceSeatActions({
        performanceId: 10,
        ...requestIdRefs(),
        selectedSeatIdsToHold: [],
        selectedSeatIdsToRelease: [3],
        seatOperationState: { status: "idle" },
        setSeatOperationState,
      }),
    );

    act(() => {
      result.current.handleReleaseSeats();
      result.current.handleReleaseSeats();
    });

    expect(client.publish).toHaveBeenCalledOnce();
    expect(setSeatOperationState).toHaveBeenCalledOnce();
  });

  it("좌석 상태 응답을 받은 뒤 지연 상태를 종료한다", () => {
    const client = setConnectedClient();
    const { result } = renderHook(() =>
      usePerformanceSeatActions({
        performanceId: 10,
        ...requestIdRefs(),
        selectedSeatIdsToHold: [],
        selectedSeatIdsToRelease: [],
        seatOperationState: { status: "idle" },
        setSeatOperationState: vi.fn(),
      }),
    );

    expect(result.current.isRefreshing).toBe(true);

    act(() => result.current.handleRefresh());
    expect(client.publish).not.toHaveBeenCalled();

    act(() => result.current.handleRefreshFinish({ status: "success" }));
    act(() => vi.advanceTimersByTime(500));
    expect(result.current.isRefreshing).toBe(false);

    act(() => result.current.handleRefresh());
    expect(result.current.isRefreshing).toBe(true);
    expect(client.publish).toHaveBeenCalledTimes(1);

    act(() => result.current.handleRefreshFinish({ status: "success" }));
    act(() => vi.advanceTimersByTime(500));
    expect(result.current.isRefreshing).toBe(false);

    act(() => result.current.handleRefreshFinish({ status: "success" }));
    expect(result.current.isRefreshing).toBe(false);
  });

  it("새로고침 조회 하나가 실패하면 다른 응답을 기다리지 않고 오류와 함께 종료한다", () => {
    setConnectedClient();
    const { result } = renderHook(() =>
      usePerformanceSeatActions({
        performanceId: 10,
        ...requestIdRefs(),
        selectedSeatIdsToHold: [],
        selectedSeatIdsToRelease: [],
        seatOperationState: { status: "idle" },
        setSeatOperationState: vi.fn(),
      }),
    );

    act(() =>
      result.current.handleRefreshFinish({
        status: "error",
        message: "조회에 실패했습니다.",
      }),
    );

    expect(result.current.isRefreshing).toBe(false);
    expect(result.current.refreshError).toBe("조회에 실패했습니다.");
  });

  it("백그라운드 좌석 상태 조회가 실패해도 동기화 오류를 표시한다", () => {
    setConnectedClient();
    const { result } = renderHook(() =>
      usePerformanceSeatActions({
        performanceId: 10,
        ...requestIdRefs(),
        selectedSeatIdsToHold: [],
        selectedSeatIdsToRelease: [],
        seatOperationState: { status: "idle" },
        setSeatOperationState: vi.fn(),
      }),
    );

    act(() => result.current.handleRefreshFinish({ status: "success" }));
    act(() => vi.advanceTimersByTime(500));
    expect(result.current.isRefreshing).toBe(false);

    act(() =>
      result.current.handleRefreshFinish({
        status: "error",
        message: "백그라운드 조회에 실패했습니다.",
      }),
    );

    expect(result.current.refreshError).toBe("백그라운드 조회에 실패했습니다.");
  });

  it("지연 종료 대기 중 실패하면 즉시 종료하고 예약된 종료 처리를 무시한다", () => {
    setConnectedClient();
    const { result } = renderHook(() =>
      usePerformanceSeatActions({
        performanceId: 10,
        ...requestIdRefs(),
        selectedSeatIdsToHold: [],
        selectedSeatIdsToRelease: [],
        seatOperationState: { status: "idle" },
        setSeatOperationState: vi.fn(),
      }),
    );

    act(() => result.current.handleRefreshFinish({ status: "success" }));
    act(() =>
      result.current.handleRefreshFinish({
        status: "error",
        message: "조회에 실패했습니다.",
      }),
    );

    expect(result.current.isRefreshing).toBe(false);
    expect(result.current.refreshError).toBe("조회에 실패했습니다.");

    act(() => vi.advanceTimersByTime(500));
    expect(result.current.isRefreshing).toBe(false);
  });

  it("loading 중 연결이 끊기면 사용자에게 연결 오류를 표시한다", () => {
    const client = setConnectedClient();
    const { result } = renderHook(() =>
      usePerformanceSeatActions({
        performanceId: 10,
        ...requestIdRefs(),
        selectedSeatIdsToHold: [],
        selectedSeatIdsToRelease: [],
        seatOperationState: { status: "loading" },
        setSeatOperationState: vi.fn(),
      }),
    );
    expect(result.current.visibleSeatOperationState).toEqual({ status: "loading" });

    act(() => useStompStore.setState({ stompClient: client as never, connectionStatus: "disconnected" }));
    expect(result.current.visibleSeatOperationState).toEqual({
      status: "error",
      message: "실시간 연결이 끊겼습니다.",
    });
  });

  it("처리 중 연결이 끊긴 뒤 재연결되면 Hold를 다시 요청할 수 있다", () => {
    const client = setConnectedClient();
    const requestRefs = requestIdRefs();
    requestRefs.performanceSeatRequestIdsRef.current.hold = "pending-hold";
    const setSeatOperationState = vi.fn();
    const { result } = renderHook(() =>
      usePerformanceSeatActions({
        performanceId: 10,
        ...requestRefs,
        selectedSeatIdsToHold: [1],
        selectedSeatIdsToRelease: [],
        seatOperationState: { status: "loading" },
        setSeatOperationState,
      }),
    );

    act(() => useStompStore.setState({ stompClient: client as never, connectionStatus: "disconnected" }));
    expect(requestRefs.performanceSeatRequestIdsRef.current.hold).toBeNull();
    expect(setSeatOperationState).toHaveBeenCalledWith({ status: "error", message: "실시간 연결이 끊겼습니다." });

    act(() => useStompStore.setState({ stompClient: client as never, connectionStatus: "connected" }));
    act(() => result.current.handleHoldSeats());

    expect(client.publish).toHaveBeenCalledWith(
      expect.objectContaining({
        path: "/performances/{performanceId}/hold-seats",
        pathParams: { performanceId: 10 },
      }),
    );
  });
});
