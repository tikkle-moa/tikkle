import { renderHook } from "@testing-library/react";

import { type CreateVenueSeatRequest, VENUE_SEAT_HEIGHT, VENUE_SEAT_WIDTH } from "@entities/venue";

import { useVenueLayoutSelection } from "@features/venue-form/model/use-venue-layout-selection";

const venueSeats: CreateVenueSeatRequest[] = [
  { sectionName: "A", seatNumber: 1, seatLabel: "A1", price: 10_000, positionX: 20, positionY: 30 },
  { sectionName: "A", seatNumber: 2, seatLabel: "A2", price: 10_000, positionX: 60, positionY: 70 },
];

describe("useVenueLayoutSelection", () => {
  it("선택된 좌석 인덱스와 전체 경계를 계산한다", () => {
    const { result } = renderHook(() => useVenueLayoutSelection({ venueSeats, selectedSeatIndices: [0, 1] }));

    expect(result.current.selectedSet).toEqual(new Set([0, 1]));
    expect(result.current.selectedBounds).toEqual({
      left: 20 - VENUE_SEAT_WIDTH / 2,
      right: 60 + VENUE_SEAT_WIDTH / 2,
      top: 30 - VENUE_SEAT_HEIGHT / 2,
      bottom: 70 + VENUE_SEAT_HEIGHT / 2,
    });
  });

  it("선택된 좌석이 없거나 유효하지 않은 인덱스면 경계가 없다", () => {
    const { result, rerender } = renderHook(({ selectedSeatIndices }) => useVenueLayoutSelection({ venueSeats, selectedSeatIndices }), {
      initialProps: { selectedSeatIndices: [] as number[] },
    });

    expect(result.current.selectedBounds).toBeNull();
    rerender({ selectedSeatIndices: [99] });
    expect(result.current.selectedBounds).toBeNull();
  });
});
