import { formatDate } from "@shared/lib/date.utils";

import { getPeriod } from "@entities/performance";
import type { PerformanceResponse } from "@entities/performance";

const makePerformance = (overrides: Partial<PerformanceResponse> = {}): PerformanceResponse => ({
  id: 1,
  concertId: 1,
  venueId: 1,
  name: "Tikkle Live",
  startsAt: new Date("2099-01-01").toISOString(),
  bookingOpensAt: null,
  createdAt: new Date("2026-01-01").toISOString(),
  status: "AVAILABLE",
  ...overrides,
});

describe("getPeriod", () => {
  it("빈 배열이면 빈 문자열을 반환한다", () => {
    expect(getPeriod([])).toBe("");
  });

  it("단일 공연의 날짜를 형식화한다", () => {
    const date = new Date("2026-10-01");
    const formatted = formatDate(date.toISOString());
    expect(getPeriod([makePerformance({ startsAt: date.toISOString() })])).toBe(`${formatted} ~ ${formatted}`);
  });

  it("복수 공연 중 가장 빠른 날짜와 가장 늦은 날짜를 반환한다", () => {
    const performances = [
      makePerformance({ id: 1, startsAt: new Date("2026-10-03").toISOString() }),
      makePerformance({ id: 2, startsAt: new Date("2026-10-01").toISOString() }),
      makePerformance({ id: 3, startsAt: new Date("2026-10-05").toISOString() }),
    ];
    const first = formatDate(new Date("2026-10-01").toISOString());
    const last = formatDate(new Date("2026-10-05").toISOString());
    expect(getPeriod(performances)).toBe(`${first} ~ ${last}`);
  });
});
