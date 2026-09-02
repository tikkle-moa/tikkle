import type { CreateVenueSeatRequest } from "@entities/venue";

import { doVenueSeatsOverlap, getVenueSeatCollisionMap } from "@features/venue-form/model/venue-seat-collision.utils";

const seat = (positionX: number, positionY: number): CreateVenueSeatRequest => ({
  sectionName: "A",
  seatNumber: 1,
  seatLabel: "A1",
  price: 10_000,
  positionX,
  positionY,
});

describe("venue seat collision utils", () => {
  it("너비와 높이 범위가 모두 교차할 때만 겹침으로 판단한다", () => {
    expect(doVenueSeatsOverlap(seat(10, 10), seat(14.49, 13.49))).toBe(true);
    expect(doVenueSeatsOverlap(seat(10, 10), seat(14.5, 10))).toBe(false);
    expect(doVenueSeatsOverlap(seat(10, 10), seat(10, 13.5))).toBe(false);
  });

  it("충돌한 좌석의 양방향 관계를 반환한다", () => {
    expect(getVenueSeatCollisionMap([seat(10, 10), seat(14, 13), seat(30, 30)])).toEqual(
      new Map([
        [0, new Set([1])],
        [1, new Set([0])],
      ]),
    );
    expect(getVenueSeatCollisionMap([])).toEqual(new Map());
  });
});
