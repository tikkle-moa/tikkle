import { useState } from "react";

import { act, renderHook, waitFor } from "@testing-library/react";

import type { VenueSeatResponse, VenueSeatState } from "@entities/venue";

import type { MyGroupHeldSeatInfo, SeatOperationState } from "@pages/performance-detail/model/seat-map.types";
import { usePerformanceSeatAvailability } from "@pages/performance-detail/model/use-performance-seat-availability";

const venueSeats = [{ id: 1, price: 10000 }] as VenueSeatResponse[];

const useSeatAvailability = (seatOperationStatus: SeatOperationState["status"]) => {
  const [selectedSeatIds, setSelectedSeatIds] = useState(new Set([1]));
  const [venueSeatStates, setVenueSeatStates] = useState<Map<number, VenueSeatState>>(new Map());

  const availability = usePerformanceSeatAvailability({
    venueSeats,
    selectedSeatIds,
    venueSeatStates,
    seatOperationStatus,
    setVenueSeatStates,
    setSelectedSeatIds,
  });

  return { selectedSeatIds, venueSeatStates, ...availability };
};

describe("usePerformanceSeatAvailability", () => {
  it("내 Hold가 확정되면 선택 상태를 유지한다", async () => {
    const { result, rerender } = renderHook(({ status }) => useSeatAvailability(status), {
      initialProps: { status: "loading" as SeatOperationState["status"] },
    });

    act(() => {
      result.current.setHeldSeatExpiresAtBySeatId(new Map([[1, new Date()]]));
    });
    expect(result.current.selectedSeatIds).toEqual(new Set([1]));

    act(() => {
      result.current.setMyGroupHeldSeatInfoBySeatId(new Map<number, MyGroupHeldSeatInfo>([[1, { holdId: "hold-1", expiresAt: new Date() }]]));
      rerender({ status: "success" });
    });

    await waitFor(() => expect(result.current.venueSeatStates.get(1)?.status).toBe("held_by_my_group"));
    expect(result.current.selectedSeatIds).toEqual(new Set([1]));
  });

  it("다른 사용자가 Hold한 좌석은 요청 실패 후 선택에서 제거한다", async () => {
    const { result, rerender } = renderHook(({ status }) => useSeatAvailability(status), {
      initialProps: { status: "loading" as SeatOperationState["status"] },
    });

    act(() => {
      result.current.setHeldSeatExpiresAtBySeatId(new Map([[1, new Date()]]));
    });
    expect(result.current.selectedSeatIds).toEqual(new Set([1]));

    rerender({ status: "error" });

    await waitFor(() => expect(result.current.selectedSeatIds).toEqual(new Set()));
  });

  it("좌석 상태가 같으면 작업 상태 변경 시 venueSeatStates 참조를 유지한다", async () => {
    const { result, rerender } = renderHook(({ status }) => useSeatAvailability(status), {
      initialProps: { status: "idle" as SeatOperationState["status"] },
    });

    await waitFor(() => expect(result.current.venueSeatStates.get(1)?.status).toBe("available"));
    const venueSeatStates = result.current.venueSeatStates;

    act(() => result.current.setBookedSeatIds(new Set()));
    await waitFor(() => expect(result.current.venueSeatStates).toBe(venueSeatStates));

    rerender({ status: "success" });

    expect(result.current.venueSeatStates).toBe(venueSeatStates);
  });

  it("다른 사용자의 Hold 변경에는 Release 대상 배열 참조를 유지한다", async () => {
    const { result } = renderHook(() => useSeatAvailability("idle"));

    act(() => {
      result.current.setMyGroupHeldSeatInfoBySeatId(new Map([[1, { holdId: "hold-1", expiresAt: new Date(Date.now() + 60000) }]]));
    });
    await waitFor(() => expect(result.current.selectedSeatIdsToRelease).toEqual([1]));
    const selectedSeatIdsToRelease = result.current.selectedSeatIdsToRelease;

    act(() => {
      result.current.setHeldSeatExpiresAtBySeatId(new Map([[2, new Date(Date.now() + 60000)]]));
    });

    expect(result.current.selectedSeatIdsToRelease).toBe(selectedSeatIdsToRelease);
  });

  it("예약 좌석을 반영하고 같은 Hold의 좌석 가격을 합산한다", async () => {
    const extendedSeats = [
      { id: 1, price: 10000 },
      { id: 2, price: 12000 },
    ] as VenueSeatResponse[];
    const { result } = renderHook(() => {
      const [selectedSeatIds, setSelectedSeatIds] = useState(new Set([1, 2]));
      const [venueSeatStates, setVenueSeatStates] = useState<Map<number, VenueSeatState>>(new Map());
      return {
        selectedSeatIds,
        venueSeatStates,
        ...usePerformanceSeatAvailability({
          venueSeats: extendedSeats,
          selectedSeatIds,
          venueSeatStates,
          seatOperationStatus: "idle",
          setVenueSeatStates,
          setSelectedSeatIds,
        }),
      };
    });

    act(() => result.current.setBookedSeatIds(new Set([2])));
    await waitFor(() => expect(result.current.venueSeatStates.get(2)?.status).toBe("booked"));
    expect(result.current.selectedSeatIds).toEqual(new Set([1]));

    act(() =>
      result.current.setMyGroupHeldSeatInfoBySeatId(
        new Map([
          [1, { holdId: "hold-1", expiresAt: new Date("2026-09-16T20:00:00") }],
          [2, { holdId: "hold-1", expiresAt: new Date("2026-09-16T20:00:00") }],
          [3, { holdId: "hold-1", expiresAt: new Date("2026-09-16T20:00:00") }],
        ]),
      ),
    );

    expect(result.current.myGroupHeldSeatTotalPrice).toBe(22000);
    expect(result.current.myGroupHolds.map(({ venueSeatIds }) => venueSeatIds).flat()).toEqual([1, 2, 3]);
  });
});
