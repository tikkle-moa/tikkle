import { act, renderHook } from "@testing-library/react";

import type { VenueSeatResponse, VenueSeatState } from "@entities/venue";

import { usePerformanceSeatMap } from "@pages/performance-detail/model/use-performance-seat-map";

const seats = [
  { id: 1, price: 10000, seatLabel: "A-1" },
  { id: 2, price: 12000, seatLabel: "A-2" },
] as VenueSeatResponse[];

describe("usePerformanceSeatMap", () => {
  it("탭 저장소의 세션을 재사용하고 없으면 공연별 세션을 생성한다", () => {
    const { result, rerender } = renderHook(() => usePerformanceSeatMap({ performanceId: 1 }));
    const sessionId = result.current.sessionId;
    expect(sessionId).toEqual(expect.any(String));
    expect(sessionStorage.getItem("tikkle.performance-seat-session:1")).toBe(sessionId);

    rerender();
    expect(result.current.sessionId).toBe(sessionId);

    const freshMap = renderHook(() => usePerformanceSeatMap({ performanceId: 2 }));
    expect(freshMap.result.current.sessionId).toEqual(expect.any(String));
    expect(freshMap.result.current.sessionId).not.toBe(sessionId);
    expect(sessionStorage.getItem("tikkle.performance-seat-session:2")).toBe(freshMap.result.current.sessionId);
  });

  it("저장된 공연별 세션을 재사용한다", () => {
    sessionStorage.setItem("tikkle.performance-seat-session:3", "stored-session");

    const { result } = renderHook(() => usePerformanceSeatMap({ performanceId: 3 }));

    expect(result.current.sessionId).toBe("stored-session");
  });

  it("같은 페이지에서 공연 회차가 바뀌면 해당 회차의 저장 세션을 다시 읽는다", () => {
    sessionStorage.setItem("tikkle.performance-seat-session:4", "session-4");
    sessionStorage.setItem("tikkle.performance-seat-session:5", "session-5");

    const { result, rerender } = renderHook(({ performanceId }) => usePerformanceSeatMap({ performanceId }), {
      initialProps: { performanceId: 4 },
    });
    expect(result.current.sessionId).toBe("session-4");

    rerender({ performanceId: 5 });

    expect(result.current.sessionId).toBe("session-5");
  });

  it("선택 가능한 좌석을 토글한다", () => {
    const { result } = renderHook(() => usePerformanceSeatMap());
    act(() => {
      result.current.setVenueSeatStates(
        new Map<number, VenueSeatState>([
          [1, { status: "available" }],
          [2, { status: "held_by_other_group", expiresAt: new Date("2026-09-16T20:00:00") }],
        ]),
      );
    });
    act(() => result.current.toggleSeat(seats[0].id));
    expect(result.current.selectedSeatIds).toEqual(new Set([1]));
    act(() => result.current.toggleSeat(seats[0].id));
    expect(result.current.selectedSeatIds).toEqual(new Set());

    act(() => result.current.toggleSeat(seats[1].id));
    expect(result.current.selectedSeatIds).toEqual(new Set());
  });

  it("좌석 집합에서 선택 가능한 좌석만 선택하고 같은 값은 참조를 유지한다", () => {
    const { result } = renderHook(() => usePerformanceSeatMap());
    act(() => {
      result.current.setVenueSeatStates(
        new Map<number, VenueSeatState>([
          [1, { status: "available" }],
          [2, { status: "held_by_other_group", expiresAt: new Date("2026-09-16T20:00:00") }],
        ]),
      );
    });
    act(() => result.current.selectSeats(new Set([1, 2])));
    const selectedSeatIds = result.current.selectedSeatIds;
    expect(selectedSeatIds).toEqual(new Set([1]));

    act(() => result.current.selectSeats(new Set([1])));
    expect(result.current.selectedSeatIds).toBe(selectedSeatIds);
  });

  it("내 Hold 행의 좌석을 일괄 선택하거나 선택 취소한다", () => {
    const { result } = renderHook(() => usePerformanceSeatMap());
    act(() => {
      result.current.setVenueSeatStates(
        new Map<number, VenueSeatState>([
          [1, { status: "held_by_my_group", expiresAt: new Date("2026-09-16T20:00:00") }],
          [2, { status: "held_by_my_group", expiresAt: new Date("2026-09-16T20:00:00") }],
        ]),
      );
    });

    act(() => result.current.toggleHeldSeats([1]));
    expect(result.current.selectedSeatIds).toEqual(new Set([1]));

    act(() => result.current.toggleHeldSeats([1, 2]));
    expect(result.current.selectedSeatIds).toEqual(new Set([1, 2]));

    act(() => result.current.toggleHeldSeats([1, 2]));
    expect(result.current.selectedSeatIds).toEqual(new Set());
  });

  it("선택할 수 없는 Hold 좌석이나 처리 중인 일괄 선택은 무시한다", () => {
    const { result } = renderHook(() => usePerformanceSeatMap());
    act(() => {
      result.current.setVenueSeatStates(
        new Map<number, VenueSeatState>([
          [1, { status: "held_by_my_group", expiresAt: new Date("2026-09-16T20:00:00") }],
          [2, { status: "held_by_other_group", expiresAt: new Date("2026-09-16T20:00:00") }],
        ]),
      );
      result.current.setSeatOperationState({ status: "loading" });
    });

    act(() => result.current.toggleHeldSeats([1]));
    expect(result.current.selectedSeatIds).toEqual(new Set());

    act(() => result.current.setSeatOperationState({ status: "success" }));
    act(() => result.current.toggleHeldSeats([2]));
    expect(result.current.selectedSeatIds).toEqual(new Set());
  });

  it("Hold 일괄 선택 후 작업 상태를 idle로 되돌린다", () => {
    const { result } = renderHook(() => usePerformanceSeatMap());
    act(() => {
      result.current.setVenueSeatStates(new Map([[1, { status: "held_by_my_group", expiresAt: new Date("2026-09-16T20:00:00") }]]));
      result.current.setSeatOperationState({ status: "success" });
    });

    act(() => result.current.toggleHeldSeats([1]));

    expect(result.current.selectedSeatIds).toEqual(new Set([1]));
    expect(result.current.seatOperationState).toEqual({ status: "idle" });
  });

  it("처리 중에는 토글과 일괄 선택을 무시하고 선택 시 상태를 idle로 되돌린다", () => {
    const { result } = renderHook(() => usePerformanceSeatMap());
    act(() => {
      result.current.setVenueSeatStates(new Map([[1, { status: "held_by_my_group", expiresAt: new Date("2026-09-16T20:00:00") }]]));
      result.current.setSeatOperationState({ status: "loading" });
    });
    act(() => {
      result.current.toggleSeat(seats[0].id);
      result.current.selectSeats(new Set([1]));
    });
    expect(result.current.selectedSeatIds).toEqual(new Set());

    act(() => {
      result.current.setSeatOperationState({ status: "success" });
    });

    act(() => {
      result.current.toggleSeat(seats[0].id);
    });

    expect(result.current.selectedSeatIds).toEqual(new Set([1]));
    expect(result.current.seatOperationState).toEqual({ status: "idle" });

    act(() => {
      result.current.toggleSeat(seats[0].id);
    });

    expect(result.current.selectedSeatIds).toEqual(new Set());

    act(() => {
      result.current.setSeatOperationState({ status: "success" });
    });

    act(() => {
      result.current.selectSeats(new Set([1]));
    });

    expect(result.current.selectedSeatIds).toEqual(new Set([1]));
    expect(result.current.seatOperationState).toEqual({ status: "idle" });
  });
});
