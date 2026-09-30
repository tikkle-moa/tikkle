import type { VenueListResponse } from "@entities/venue";

import { filterAndSortVenues, isVenueSort, isVenueSortDirection } from "@features/venue-filter";

const venues: VenueListResponse[] = [
  {
    id: 1,
    name: "가 홀",
    address: "서울특별시 강남구",
    width: 100,
    height: 80,
    createdAt: "2026-09-01T00:00:00",
    venueSeatCount: 100,
    concertCount: 3,
  },
  {
    id: 2,
    name: "나 아레나",
    address: "부산광역시 해운대구",
    width: 120,
    height: 90,
    createdAt: "2026-09-02T00:00:00",
    venueSeatCount: 500,
    concertCount: 1,
  },
  {
    id: 3,
    name: "다 극장",
    address: "",
    width: 90,
    height: 70,
    createdAt: "2026-09-03T00:00:00",
    venueSeatCount: 300,
    concertCount: 5,
  },
];

describe("venue list filter utils", () => {
  it.each(["name", "capacity", "region", "popular"])("%s를 정렬 기준으로 인식한다", (value) => {
    expect(isVenueSort(value)).toBe(true);
  });

  it.each([null, "", "unknown"])("%s를 잘못된 정렬 기준으로 처리한다", (value) => {
    expect(isVenueSort(value)).toBe(false);
  });

  it.each(["asc", "desc"])("%s를 정렬 방향으로 인식한다", (value) => {
    expect(isVenueSortDirection(value)).toBe(true);
  });

  it.each([null, "", "unknown"])("%s를 잘못된 정렬 방향으로 처리한다", (value) => {
    expect(isVenueSortDirection(value)).toBe(false);
  });

  it("검색어, 지역과 최소 수용 인원을 함께 적용한다", () => {
    const result = filterAndSortVenues(venues, " 아레나 ", ["부산광역시"], 400, "name", "asc");

    expect(result.map(({ id }) => id)).toEqual([2]);
  });

  it("필터가 비어 있으면 모든 공연장을 유지한다", () => {
    const result = filterAndSortVenues(venues, "", [], 0, "name", "asc");

    expect(result.map(({ id }) => id)).toEqual([1, 2, 3]);
    expect(result).not.toBe(venues);
  });

  it.each([
    ["name", "desc", [3, 2, 1]],
    ["capacity", "asc", [1, 3, 2]],
    ["capacity", "desc", [2, 3, 1]],
    ["region", "asc", [3, 2, 1]],
    ["region", "desc", [1, 2, 3]],
    ["popular", "asc", [2, 1, 3]],
    ["popular", "desc", [3, 1, 2]],
  ] as const)("%s %s 정렬을 적용한다", (sort, direction, expectedIds) => {
    const result = filterAndSortVenues(venues, "", [], 0, sort, direction);

    expect(result.map(({ id }) => id)).toEqual(expectedIds);
  });
});
