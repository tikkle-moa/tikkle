import { renderHook } from "@testing-library/react";

import { VENUE_SEAT_HEIGHT, VENUE_SEAT_WIDTH } from "@entities/venue";

import { useVenueLayoutSelection } from "@features/venue-form/model/use-venue-layout-selection";
import type { VenueFormSeat } from "@features/venue-form/model/venue-form.types";

const venueSeats: VenueFormSeat[] = [
  { clientId: 10, sectionName: "A", seatNumber: 1, seatLabel: "A1", price: 10_000, positionX: 20, positionY: 30 },
  { clientId: 20, sectionName: "A", seatNumber: 2, seatLabel: "A2", price: 10_000, positionX: 60, positionY: 70 },
];

describe("useVenueLayoutSelection", () => {
  it("선택된 좌석 인덱스와 전체 경계를 계산한다", () => {
    const { result } = renderHook(() => useVenueLayoutSelection({ venueSeats, selectedSeatClientIds: [10, 20] }));

    expect(result.current.selectedSeatClientIdSet).toEqual(new Set([10, 20]));
    expect(result.current.selectedBounds).toEqual({
      left: 20 - VENUE_SEAT_WIDTH / 2,
      right: 60 + VENUE_SEAT_WIDTH / 2,
      top: 30 - VENUE_SEAT_HEIGHT / 2,
      bottom: 70 + VENUE_SEAT_HEIGHT / 2,
    });
  });

  it("선택된 좌석이 없거나 유효하지 않은 인덱스면 경계가 없다", () => {
    const { result, rerender } = renderHook(({ selectedSeatClientIds }) => useVenueLayoutSelection({ venueSeats, selectedSeatClientIds }), {
      initialProps: { selectedSeatClientIds: [] as number[] },
    });

    expect(result.current.selectedBounds).toBeNull();
    rerender({ selectedSeatClientIds: [99] });
    expect(result.current.selectedBounds).toBeNull();
  });

  it("빈 구역명은 미지정 구역으로 표시한다", () => {
    const { result } = renderHook(() => useVenueLayoutSelection({ venueSeats: [{ ...venueSeats[0], sectionName: "" }], selectedSeatClientIds: [] }));
    expect(result.current.sectionNames).toEqual(["미지정"]);
  });
});
