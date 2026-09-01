import type { KeyboardEvent } from "react";

import { act, renderHook } from "@testing-library/react";

import type { VenueSeatResponse } from "@entities/venue";

import { useVenueMapSelection } from "@features/venue-map/model/use-venue-map-selection";

const seat: VenueSeatResponse = {
  id: 1,
  venueId: 1,
  sectionName: "A구역",
  seatNumber: 1,
  seatLabel: "A구역 1열 1번",
  price: 150000,
  positionX: 20,
  positionY: 28,
  createdAt: "2026-08-25T12:00:00",
};

describe("useVenueMapSelection", () => {
  it("초기에는 선택된 좌석이 없다", () => {
    const { result } = renderHook(() => useVenueMapSelection());

    expect(result.current.selectedSeat).toBeNull();
  });

  it("좌석을 선택하고 선택을 해제한다", () => {
    const { result } = renderHook(() => useVenueMapSelection());

    act(() => {
      result.current.selectSeat(seat);
    });

    expect(result.current.selectedSeat).toEqual(seat);

    act(() => {
      result.current.selectSeat(null);
    });

    expect(result.current.selectedSeat).toBeNull();
  });

  it.each(["Enter", " "])("%s 키로 좌석을 선택한다", (key) => {
    const { result } = renderHook(() => useVenueMapSelection());
    const preventDefault = vi.fn();

    act(() => {
      result.current.handleSeatKeyDown({ key, preventDefault } as unknown as KeyboardEvent<SVGRectElement>, seat);
    });

    expect(preventDefault).toHaveBeenCalledTimes(1);
    expect(result.current.selectedSeat).toEqual(seat);
  });

  it("Enter와 Space 이외 키는 선택하지 않는다", () => {
    const { result } = renderHook(() => useVenueMapSelection());
    const preventDefault = vi.fn();

    act(() => {
      result.current.handleSeatKeyDown({ key: "Escape", preventDefault } as unknown as KeyboardEvent<SVGRectElement>, seat);
    });

    expect(preventDefault).not.toHaveBeenCalled();
    expect(result.current.selectedSeat).toBeNull();
  });
});
