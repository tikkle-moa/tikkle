import type { KeyboardEvent } from "react";

import { act, renderHook } from "@testing-library/react";

import type { VenueSeatResponse } from "@entities/venue";

import { useVenueMapSelection } from "@features/venue-map/model/use-venue-map-selection";

const seats: VenueSeatResponse[] = [
  {
    id: 1,
    venueId: 1,
    sectionName: "A구역",
    seatNumber: 1,
    seatLabel: "A구역 1열 1번",
    price: 150000,
    positionX: 20,
    positionY: 28,
    createdAt: "2026-08-25T12:00:00",
  },
  {
    id: 2,
    venueId: 1,
    sectionName: "A구역",
    seatNumber: 2,
    seatLabel: "A구역 1열 2번",
    price: 150000,
    positionX: 23,
    positionY: 28,
    createdAt: "2026-08-25T12:00:00",
  },
  {
    id: 3,
    venueId: 1,
    sectionName: "A구역",
    seatNumber: 3,
    seatLabel: "A구역 2열 1번",
    price: 150000,
    positionX: 20,
    positionY: 31,
    createdAt: "2026-08-25T12:00:00",
  },
  {
    id: 4,
    venueId: 1,
    sectionName: "A구역",
    seatNumber: 4,
    seatLabel: "A구역 2열 2번",
    price: 150000,
    positionX: 23,
    positionY: 31,
    createdAt: "2026-08-25T12:00:00",
  },
];

const createKeyDownEvent = (key: string) => {
  const preventDefault = vi.fn();
  const focus = vi.fn();
  const querySelector = vi.fn().mockReturnValue({ focus });

  return {
    preventDefault,
    focus,
    querySelector,
    event: {
      key,
      preventDefault,
      currentTarget: {
        ownerSVGElement: { querySelector },
      },
    } as unknown as KeyboardEvent<SVGRectElement>,
  };
};

describe("useVenueMapSelection", () => {
  it("초기에는 선택된 좌석이 없고 첫 좌석만 Tab으로 이동할 수 있다", () => {
    const { result } = renderHook(() => useVenueMapSelection(seats));

    expect(result.current.selectedSeat).toBeNull();
    expect(result.current.getSeatTabIndex(seats[0])).toBe(0);
    expect(result.current.getSeatTabIndex(seats[1])).toBe(-1);
  });

  it("좌석을 선택하면 선택된 좌석만 Tab으로 이동할 수 있다", () => {
    const { result } = renderHook(() => useVenueMapSelection(seats));

    act(() => {
      result.current.selectSeat(seats[3]);
    });

    expect(result.current.selectedSeat).toEqual(seats[3]);
    expect(result.current.getSeatTabIndex(seats[0])).toBe(-1);
    expect(result.current.getSeatTabIndex(seats[3])).toBe(0);

    act(() => {
      result.current.selectSeat(null);
    });

    expect(result.current.selectedSeat).toBeNull();
    expect(result.current.getSeatTabIndex(seats[0])).toBe(0);
  });

  it.each(["Enter", " "])("%s 키로 현재 좌석을 선택한다", (key) => {
    const { result } = renderHook(() => useVenueMapSelection(seats));
    const { event, preventDefault } = createKeyDownEvent(key);

    act(() => {
      result.current.handleSeatKeyDown(event, seats[1]);
    });

    expect(preventDefault).toHaveBeenCalledTimes(1);
    expect(result.current.selectedSeat).toEqual(seats[1]);
  });

  it.each([
    ["ArrowRight", seats[0], seats[1]],
    ["ArrowDown", seats[0], seats[2]],
    ["ArrowLeft", seats[3], seats[2]],
    ["ArrowUp", seats[3], seats[1]],
  ])("%s 키로 인접 좌석을 선택하고 포커스를 이동한다", (key, currentSeat, adjacentSeat) => {
    const { result } = renderHook(() => useVenueMapSelection(seats));
    const { event, preventDefault, querySelector, focus } = createKeyDownEvent(key);

    act(() => {
      result.current.handleSeatKeyDown(event, currentSeat);
    });

    expect(preventDefault).toHaveBeenCalledTimes(1);
    expect(result.current.selectedSeat).toEqual(adjacentSeat);
    expect(result.current.getSeatTabIndex(adjacentSeat)).toBe(0);
    expect(querySelector).toHaveBeenCalledWith(`[data-seat-id="${adjacentSeat.id}"]`);
    expect(focus).toHaveBeenCalledTimes(1);
  });

  it("인접 좌석이 없는 방향키는 선택이나 포커스를 변경하지 않는다", () => {
    const { result } = renderHook(() => useVenueMapSelection(seats));
    const { event, preventDefault, querySelector } = createKeyDownEvent("ArrowRight");

    act(() => {
      result.current.handleSeatKeyDown(event, seats[1]);
    });

    expect(preventDefault).not.toHaveBeenCalled();
    expect(result.current.selectedSeat).toBeNull();
    expect(querySelector).not.toHaveBeenCalled();
  });

  it("지원하지 않는 키는 선택하지 않는다", () => {
    const { result } = renderHook(() => useVenueMapSelection(seats));
    const { event, preventDefault, querySelector } = createKeyDownEvent("Escape");

    act(() => {
      result.current.handleSeatKeyDown(event, seats[0]);
    });

    expect(preventDefault).not.toHaveBeenCalled();
    expect(result.current.selectedSeat).toBeNull();
    expect(querySelector).not.toHaveBeenCalled();
  });
});
