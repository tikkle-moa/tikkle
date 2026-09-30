import { areSeatIdsEqual, isHeldSeatStatus } from "@entities/venue";

describe("venue seat utils", () => {
  it.each([
    ["held_by_my_group", true],
    ["held_by_other_group", true],
    ["available", false],
    ["booked", false],
  ] as const)("%s의 Hold 여부를 반환한다", (status, expected) => {
    expect(isHeldSeatStatus(status)).toBe(expected);
  });

  it("좌석 ID 집합을 값으로 비교한다", () => {
    const ids = new Set([1, 2]);
    expect(areSeatIdsEqual(ids, ids)).toBe(true);
    expect(areSeatIdsEqual(undefined, ids)).toBe(false);
    expect(areSeatIdsEqual(ids, new Set([1]))).toBe(false);
    expect(areSeatIdsEqual(ids, new Set([1, 3]))).toBe(false);
    expect(areSeatIdsEqual(ids, new Set([2, 1]))).toBe(true);
  });
});
