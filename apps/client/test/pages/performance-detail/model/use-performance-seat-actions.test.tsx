import { act, renderHook } from "@testing-library/react";

import { useStompStore } from "@shared/realtime/stomp.store";

import { usePerformanceSeatActions } from "@pages/performance-detail/model/use-performance-seat-actions";

const setConnectedClient = () => {
  const client = { publish: vi.fn() };
  act(() => useStompStore.setState({ stompClient: client as never, connectionStatus: "connected" }));
  return client;
};

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

  it("Hold와 Release 요청을 발행하고 loading 상태로 전환한다", () => {
    const client = setConnectedClient();
    const setSeatOperationState = vi.fn();
    const { result } = renderHook(() =>
      usePerformanceSeatActions({
        performanceId: 10,
        sessionId: "session-1",
        selectedSeatIdsToHold: [1, 2],
        selectedSeatIdsToRelease: [3],
        seatOperationState: { status: "idle" },
        setSeatOperationState,
      }),
    );

    act(() => {
      result.current.handleHoldSeats();
      result.current.handleReleaseSeats();
    });

    expect(client.publish).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        path: "/performances/{performanceId}/hold-seats",
        pathParams: { performanceId: 10 },
        command: expect.objectContaining({ data: [1, 2], sessionId: "session-1" }),
      }),
    );
    expect(client.publish).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        path: "/performances/{performanceId}/release-seats",
        command: expect.objectContaining({ data: [3], sessionId: "session-1" }),
      }),
    );
    expect(setSeatOperationState).toHaveBeenCalledTimes(2);
    expect(setSeatOperationState).toHaveBeenLastCalledWith({ status: "loading" });
  });

  it("새로고침 응답 두 종류를 받은 뒤 지연 상태를 종료한다", () => {
    const client = setConnectedClient();
    const { result } = renderHook(() =>
      usePerformanceSeatActions({
        performanceId: 10,
        sessionId: "session-1",
        selectedSeatIdsToHold: [],
        selectedSeatIdsToRelease: [],
        seatOperationState: { status: "idle" },
        setSeatOperationState: vi.fn(),
      }),
    );

    expect(result.current.isRefreshing).toBe(true);

    act(() => result.current.handleRefresh());
    expect(client.publish).not.toHaveBeenCalled();

    act(() => result.current.handleRefreshFinish("seatStatus", { status: "success" }));
    expect(result.current.isRefreshing).toBe(true);
    act(() => result.current.handleRefreshFinish("myHeldSeats", { status: "success" }));
    act(() => vi.advanceTimersByTime(500));
    expect(result.current.isRefreshing).toBe(false);

    act(() => result.current.handleRefresh());
    expect(result.current.isRefreshing).toBe(true);
    expect(client.publish).toHaveBeenCalledTimes(2);
    expect(client.publish).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        path: "/performances/{performanceId}/get-my-group-holds",
        command: expect.objectContaining({ sessionId: "session-1" }),
      }),
    );

    act(() => result.current.handleRefreshFinish("seatStatus", { status: "success" }));
    act(() => result.current.handleRefreshFinish("myHeldSeats", { status: "success" }));
    act(() => vi.advanceTimersByTime(500));
    expect(result.current.isRefreshing).toBe(false);

    act(() => result.current.handleRefreshFinish("seatStatus", { status: "success" }));
    expect(result.current.isRefreshing).toBe(false);
  });

  it("새로고침 조회 하나가 실패하면 다른 응답을 기다리지 않고 오류와 함께 종료한다", () => {
    setConnectedClient();
    const { result } = renderHook(() =>
      usePerformanceSeatActions({
        performanceId: 10,
        selectedSeatIdsToHold: [],
        selectedSeatIdsToRelease: [],
        seatOperationState: { status: "idle" },
        setSeatOperationState: vi.fn(),
      }),
    );

    act(() =>
      result.current.handleRefreshFinish("seatStatus", {
        status: "error",
        message: "조회에 실패했습니다.",
      }),
    );

    expect(result.current.isRefreshing).toBe(false);
    expect(result.current.refreshError).toBe("좌석 상태: 조회에 실패했습니다.");
  });

  it("지연 종료 대기 중 실패하면 즉시 종료하고 예약된 종료 처리를 무시한다", () => {
    setConnectedClient();
    const { result } = renderHook(() =>
      usePerformanceSeatActions({
        performanceId: 10,
        selectedSeatIdsToHold: [],
        selectedSeatIdsToRelease: [],
        seatOperationState: { status: "idle" },
        setSeatOperationState: vi.fn(),
      }),
    );

    act(() => result.current.handleRefreshFinish("seatStatus", { status: "success" }));
    act(() => result.current.handleRefreshFinish("myHeldSeats", { status: "success" }));
    act(() =>
      result.current.handleRefreshFinish("myHeldSeats", {
        status: "error",
        message: "조회에 실패했습니다.",
      }),
    );

    expect(result.current.isRefreshing).toBe(false);
    expect(result.current.refreshError).toBe("내 점유 좌석: 조회에 실패했습니다.");

    act(() => vi.advanceTimersByTime(500));
    expect(result.current.isRefreshing).toBe(false);
  });

  it("loading 중 연결이 끊기면 사용자에게 연결 오류를 표시한다", () => {
    const client = setConnectedClient();
    const { result } = renderHook(() =>
      usePerformanceSeatActions({
        performanceId: 10,
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
});
