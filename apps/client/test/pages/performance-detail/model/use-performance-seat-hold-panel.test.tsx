import { act, renderHook } from "@testing-library/react";

import { usePerformanceSeatHoldPanel } from "@pages/performance-detail/model/use-performance-seat-hold-panel";

const { mockAvailability, mockActions, mockSubscriptions, handleHoldSeats } = vi.hoisted(() => ({
  mockAvailability: vi.fn(),
  mockActions: vi.fn(),
  mockSubscriptions: vi.fn(),
  handleHoldSeats: vi.fn(),
}));

vi.mock("@pages/performance-detail/model/use-performance-seat-availability", () => ({
  usePerformanceSeatAvailability: mockAvailability,
}));
vi.mock("@pages/performance-detail/model/use-performance-seat-actions", () => ({
  usePerformanceSeatActions: mockActions,
}));
vi.mock("@pages/performance-detail/model/use-performance-seat-subscriptions", () => ({
  usePerformanceSeatSubscriptions: mockSubscriptions,
}));

const props = {
  performanceId: 10,
  sessionId: "session-1",
  venueSeats: [],
  venueSeatStates: new Map(),
  selectedSeatIds: new Set<number>(),
  seatOperationState: { status: "idle" as const },
  setVenueSeatStates: vi.fn(),
  setSelectedSeatIds: vi.fn(),
  setServerTimeOffset: vi.fn(),
  setSeatOperationState: vi.fn(),
};

const setMocks = (selectedSeatIdsToHold: number[]) => {
  mockAvailability.mockReturnValue({
    myGroupHoldInfoByHoldId: new Map(),
    myGroupHeldSeatInfoBySeatId: new Map(),
    selectedSeatIdsToHold,
    selectedSeatIdsToRelease: [],
    myGroupHeldSeatTotalPrice: 0,
    venueSeatById: new Map(),
    setBookedSeatIds: vi.fn(),
    setHeldSeatExpiresAtBySeatId: vi.fn(),
    setMyGroupHeldSeatInfoBySeatId: vi.fn(),
  });
  mockActions.mockReturnValue({
    isRefreshing: false,
    visibleSeatOperationState: { status: "idle" },
    handleHoldSeats,
    handleReleaseSeats: vi.fn(),
    handleRefresh: vi.fn(),
    handleRefreshFinish: vi.fn(),
  });
  mockSubscriptions.mockReturnValue({
    isConnected: true,
    connectionStyle: {
      label: "실시간 연결됨",
      description: "연결됨",
      className: "",
      dotClassName: "",
    },
  });
};

describe("usePerformanceSeatHoldPanel", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    handleHoldSeats.mockClear();
  });

  afterEach(() => vi.useRealTimers());

  it("선택할 좌석이 없으면 자동 Hold를 예약하지 않는다", () => {
    setMocks([]);
    renderHook(() => usePerformanceSeatHoldPanel(props));

    expect(mockActions).toHaveBeenCalledWith(expect.objectContaining({ sessionId: "session-1" }));
    expect(mockSubscriptions).toHaveBeenCalledWith(expect.objectContaining({ sessionId: "session-1" }));
    act(() => vi.advanceTimersByTime(500));
    expect(handleHoldSeats).not.toHaveBeenCalled();
  });

  it("선택 좌석을 500ms 후 자동 Hold한다", () => {
    setMocks([1]);
    renderHook(() => usePerformanceSeatHoldPanel(props));

    act(() => vi.advanceTimersByTime(499));
    expect(handleHoldSeats).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(1));
    expect(handleHoldSeats).toHaveBeenCalledOnce();
  });

  it("자동 Hold 전에 언마운트하면 timeout을 정리한다", () => {
    const clearTimeout = vi.spyOn(window, "clearTimeout");
    setMocks([1]);
    const { unmount } = renderHook(() => usePerformanceSeatHoldPanel(props));

    unmount();
    expect(clearTimeout).toHaveBeenCalledOnce();
    expect(handleHoldSeats).not.toHaveBeenCalled();
  });
});
