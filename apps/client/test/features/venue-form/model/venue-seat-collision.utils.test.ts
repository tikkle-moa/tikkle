import type { CreateVenueRequest } from "@entities/venue";

import type { VenueFormSeat } from "@features/venue-form/model/venue-form.types";
import {
  addVenueSeatToGrid,
  createVenueSeatGrid,
  doVenueSeatsOverlap,
  getNearbyVenueSeats,
  getVenueSeatCollisionMap,
} from "@features/venue-form/model/venue-seat-collision.utils";

const venue: CreateVenueRequest = {
  name: "공연장",
  address: "주소",
  description: null,
  width: 100,
  height: 100,
  stagePositionX: 80,
  stagePositionY: 80,
  stageWidth: 10,
  stageHeight: 10,
};

const seat = (positionX: number, positionY: number, clientId = 1): VenueFormSeat => ({
  clientId,
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
    expect(getVenueSeatCollisionMap(venue, [seat(10, 10, 1), seat(14, 13, 2), seat(11, 12, 3), seat(18.5, 13, 4), seat(30, 30, 5)])).toEqual(
      new Map([
        [1, new Set([2, 3])],
        [2, new Set([1, 3])],
        [3, new Set([1, 2])],
      ]),
    );
    expect(getVenueSeatCollisionMap(venue, [])).toEqual(new Map());
  });

  it("무대와 겹치는 좌석은 무대 식별자를 충돌 관계에 포함한다", () => {
    expect(getVenueSeatCollisionMap(venue, [seat(80, 80, 1)])).toEqual(new Map([[1, new Set([-1])]]));
  });

  it("주변 격자를 순회하고 callback이 true이면 조기에 종료한다", () => {
    const first = seat(10, 10, 1);
    const second = seat(11, 11, 2);
    const grid = createVenueSeatGrid([first]);
    addVenueSeatToGrid(second, grid);
    const callback = vi.fn(() => true);

    expect(getNearbyVenueSeats(first, grid, callback)).toBe(true);
    expect(callback).toHaveBeenCalledOnce();
    expect(getNearbyVenueSeats(seat(90, 10), grid, vi.fn())).toBe(false);
  });

  it("이동 대상과 기존 충돌 관계만 제거한 뒤 주변 좌석 및 무대 충돌을 다시 계산한다", () => {
    const currentCollisionMap = new Map([
      [1, new Set([2, -1])],
      [2, new Set([1])],
      [3, new Set([99])],
    ]);
    const movedSeats = [seat(80, 80, 1), seat(81, 81, 2), seat(30, 30, 3)];

    expect(getVenueSeatCollisionMap(venue, movedSeats, { currentCollisionMap, targetClientIds: [1, 2] })).toEqual(
      new Map([
        [3, new Set([99])],
        [1, new Set([2, -1])],
        [2, new Set([1, -1])],
      ]),
    );
  });

  it("이동 대상의 이전 상대 좌석에 충돌 목록이 없어도 안전하게 다시 계산한다", () => {
    const currentCollisionMap = new Map([[1, new Set([99])]]);

    expect(getVenueSeatCollisionMap(venue, [seat(10, 10, 1)], { currentCollisionMap, targetClientIds: [1] })).toEqual(new Map());
  });

  it("이동 대상과의 충돌을 제거해도 상대 좌석의 다른 충돌은 유지한다", () => {
    const currentCollisionMap = new Map([
      [1, new Set([2])],
      [2, new Set([1, 3])],
      [3, new Set([2])],
    ]);

    expect(
      getVenueSeatCollisionMap(venue, [seat(10, 10, 1), seat(30, 30, 2), seat(60, 60, 3)], { currentCollisionMap, targetClientIds: [1] }),
    ).toEqual(
      new Map([
        [2, new Set([3])],
        [3, new Set([2])],
      ]),
    );
  });

  it("이동 대상과 인접 격자에 있지만 영역이 겹치지 않는 좌석은 제외한다", () => {
    expect(
      getVenueSeatCollisionMap(venue, [seat(10, 10, 1), seat(14.5, 10, 2)], {
        currentCollisionMap: new Map(),
        targetClientIds: [1],
      }),
    ).toEqual(new Map());
  });
});
