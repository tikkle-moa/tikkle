import { act, renderHook } from "@testing-library/react";

import type { VenueSeatResponse, VenueSeatState, VenueSeatStatus } from "@entities/venue";

import { useVenueMapSeatTooltip } from "@features/venue-map/model/use-venue-map-seat-tooltip";

const seat = { id: 1, positionX: 20, positionY: 20 } as VenueSeatResponse;
const eventTarget = {
  getBoundingClientRect: () => ({ left: 15, top: 20, width: 10, height: 8 }),
  ownerSVGElement: {
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 100, height: 100 }),
  },
} as unknown as SVGGElement;
const createStates = (status: VenueSeatStatus): Map<number, VenueSeatState> =>
  new Map([
    [1, status === "held_by_my_group" || status === "held_by_other_group" ? { status, expiresAt: new Date("2026-09-16T20:00:00") } : { status }],
  ]);
const createPointerEvent = (pointerType: "mouse" | "touch" = "mouse") => ({ currentTarget: eventTarget, pointerType }) as never;

describe("useVenueMapSeatTooltip", () => {
  it("held 좌석의 마우스 pointer에서 tooltip을 열고 leave에서 닫는다", () => {
    const { result } = renderHook(() => useVenueMapSeatTooltip({ venueSeats: [seat], venueSeatStates: createStates("held_by_my_group") }));

    act(() => result.current.handlePointerEnter(createPointerEvent(), seat));
    expect(result.current.isTooltipVisible).toBe(true);
    expect(result.current.activeSeat).toBe(seat);
    expect(result.current.tooltipPosition).toEqual({ left: 20, top: 20, bottom: 28 });

    act(() => result.current.handlePointerMove(createPointerEvent()));
    expect(result.current.tooltipPosition).toEqual({ left: 20, top: 20, bottom: 28 });
    act(() => result.current.handlePointerLeave());
    expect(result.current.activeSeat).toBeNull();
    expect(result.current.tooltipPosition).toBeNull();
  });

  it("터치 pointer에서는 held 좌석 tooltip을 열지 않는다", () => {
    const { result } = renderHook(() => useVenueMapSeatTooltip({ venueSeats: [seat], venueSeatStates: createStates("held_by_my_group") }));

    act(() => result.current.handlePointerEnter(createPointerEvent("touch"), seat));
    act(() => result.current.handlePointerMove(createPointerEvent("touch")));

    expect(result.current.isTooltipVisible).toBe(false);
    expect(result.current.activeSeat).toBeNull();
  });

  it("held가 아닌 좌석은 tooltip을 열지 않는다", () => {
    const { result } = renderHook(() => useVenueMapSeatTooltip({ venueSeats: [seat], venueSeatStates: createStates("available") }));

    act(() => result.current.handlePointerEnter(createPointerEvent(), seat));
    expect(result.current.isTooltipVisible).toBe(false);
    expect(result.current.activeSeat).toBeNull();
  });

  it("pointer 이동 시 좌석의 viewport 위치로 tooltip 좌표를 갱신한다", () => {
    const { result } = renderHook(() => useVenueMapSeatTooltip({ venueSeats: [seat], venueSeatStates: createStates("held_by_my_group") }));
    const movedTarget = {
      getBoundingClientRect: () => ({ left: 45, top: 30, width: 10, height: 8 }),
    };

    act(() => result.current.handlePointerMove({ currentTarget: movedTarget, pointerType: "mouse" } as never));
    expect(result.current.tooltipPosition).toEqual({ left: 50, top: 30, bottom: 38 });
  });

  it("svg bounds 없이도 held 좌석의 viewport 위치에 tooltip을 연다", () => {
    const { result } = renderHook(() => useVenueMapSeatTooltip({ venueSeats: [seat], venueSeatStates: createStates("held_by_my_group") }));
    const target = {
      getBoundingClientRect: () => ({ left: 35, top: 40, width: 10, height: 8 }),
    };

    act(() => result.current.handlePointerEnter({ currentTarget: target, pointerType: "mouse" } as never, seat));

    expect(result.current.activeSeat).toBe(seat);
    expect(result.current.tooltipPosition).toEqual({ left: 40, top: 40, bottom: 48 });
    expect(result.current.isTooltipVisible).toBe(true);
  });

  it("상태가 없는 held 좌석도 기본 available 상태로 계산한다", () => {
    const { result, rerender } = renderHook(({ venueSeatStates }) => useVenueMapSeatTooltip({ venueSeats: [seat], venueSeatStates }), {
      initialProps: { venueSeatStates: createStates("held_by_my_group") },
    });

    act(() => result.current.handlePointerEnter(createPointerEvent(), seat));
    rerender({ venueSeatStates: new Map<number, VenueSeatState>() });

    expect(result.current.activeSeatStatus).toBe("available");
    expect(result.current.isTooltipVisible).toBe(false);
  });

  it("지도에 없는 held 좌석은 active seat을 찾지 못한다", () => {
    const unknownSeat = { ...seat, id: 2 };
    const { result } = renderHook(() =>
      useVenueMapSeatTooltip({
        venueSeats: [seat],
        venueSeatStates: new Map([[2, { status: "held_by_my_group", expiresAt: new Date("2026-09-16T20:00:00") }]]),
      }),
    );

    act(() => result.current.handlePointerEnter(createPointerEvent(), unknownSeat));

    expect(result.current.activeSeat).toBeNull();
    expect(result.current.activeSeatStatus).toBeNull();
  });

  it("좌석 상태 map이 없으면 pointer를 available로 처리한다", () => {
    const { result } = renderHook(() => useVenueMapSeatTooltip({ venueSeats: [seat] }));

    act(() => result.current.handlePointerEnter(createPointerEvent(), seat));

    expect(result.current.activeSeat).toBeNull();
    expect(result.current.isTooltipVisible).toBe(false);
  });
});
