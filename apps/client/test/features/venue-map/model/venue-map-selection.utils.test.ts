import type { VenueSeatResponse } from "@entities/venue";

import type { SeatNavigationDirection } from "@features/venue-map/model/venue-map-selection.types";
import { findAdjacentSeat, isSeatNavigationDirection } from "@features/venue-map/model/venue-map-selection.utils";

const createSeat = (id: number, positionX: number, positionY: number): VenueSeatResponse => ({
  id,
  venueId: 1,
  sectionName: "A구역",
  seatNumber: id,
  seatLabel: `A구역 ${id}번`,
  price: 150000,
  positionX,
  positionY,
  createdAt: "2026-08-25T12:00:00",
});

const seats = [createSeat(1, 20, 28), createSeat(2, 23, 28), createSeat(3, 20, 31), createSeat(4, 23, 31)];

const navigationCases: Array<{
  direction: SeatNavigationDirection;
  currentSeat: VenueSeatResponse;
  adjacentSeat: VenueSeatResponse;
}> = [
  { direction: "ArrowRight", currentSeat: seats[0], adjacentSeat: seats[1] },
  { direction: "ArrowDown", currentSeat: seats[0], adjacentSeat: seats[2] },
  { direction: "ArrowLeft", currentSeat: seats[3], adjacentSeat: seats[2] },
  { direction: "ArrowUp", currentSeat: seats[3], adjacentSeat: seats[1] },
];

describe("venue map selection utils", () => {
  it.each(["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"])("%s 키를 좌석 탐색 키로 인식한다", (key) => {
    expect(isSeatNavigationDirection(key)).toBe(true);
  });

  it.each(["Enter", "Escape", "Tab"])("%s 키는 좌석 탐색 키가 아니다", (key) => {
    expect(isSeatNavigationDirection(key)).toBe(false);
  });

  it.each(navigationCases)("$direction 키로 인접 좌석을 찾는다", ({ direction, currentSeat, adjacentSeat }) => {
    expect(findAdjacentSeat(currentSeat, seats, direction)).toBe(adjacentSeat);
  });

  it("같은 방향의 후보 중 같은 행 또는 열에 있는 좌석을 우선한다", () => {
    const currentSeat = createSeat(1, 20, 28);
    const diagonalSeat = createSeat(2, 21, 29);
    const sameRowSeat = createSeat(3, 30, 28);

    expect(findAdjacentSeat(currentSeat, [currentSeat, diagonalSeat, sameRowSeat], "ArrowRight")).toBe(sameRowSeat);
  });

  it("탐색 방향에 좌석이 없으면 null을 반환한다", () => {
    expect(findAdjacentSeat(seats[1], seats, "ArrowRight")).toBeNull();
  });
});
