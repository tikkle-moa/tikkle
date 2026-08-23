import type { PerformanceResponse } from "@entities/performance";
import { formatPerformanceDateTime, getPerformancePeriod } from "@entities/performance";

const makePerformance = (startsAt: string): PerformanceResponse => ({
  id: 1,
  concertId: 1,
  startsAt,
  bookingOpensAt: null,
  createdAt: "2026-08-23T12:00:00",
});

describe("getPerformancePeriod", () => {
  it("회차가 없으면 준비 중 문구를 반환한다", () => {
    expect(getPerformancePeriod([])).toBe("회차 준비 중");
  });

  it("회차가 하나면 해당 일시를 반환한다", () => {
    const performance = makePerformance("2026-09-01T19:00:00");

    expect(getPerformancePeriod([performance])).toBe(formatPerformanceDateTime(performance.startsAt));
  });

  it("여러 회차면 가장 이른 일시와 늦은 일시를 반환한다", () => {
    const firstPerformance = makePerformance("2026-09-01T19:00:00");
    const lastPerformance = makePerformance("2026-09-03T19:00:00");

    expect(getPerformancePeriod([lastPerformance, firstPerformance])).toBe(
      `${formatPerformanceDateTime(firstPerformance.startsAt)} ~ ${formatPerformanceDateTime(lastPerformance.startsAt)}`,
    );
  });
});
