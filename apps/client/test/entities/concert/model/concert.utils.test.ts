import { formatDate } from "@shared/lib/date.utils";

import { getBookingStatus, getPeriod } from "@entities/concert";
import type { PerformanceResponse } from "@entities/performance";

const PAST = new Date("2000-01-01").toISOString();
const FUTURE = new Date("2099-01-01").toISOString();

const makePerformance = (overrides: Partial<PerformanceResponse> = {}): PerformanceResponse => ({
  id: 1,
  concertId: 1,
  startsAt: FUTURE,
  bookingOpensAt: null,
  createdAt: new Date("2026-01-01").toISOString(),
  ...overrides,
});

describe("getBookingStatus", () => {
  it("모든 공연이 과거이면 ended를 반환한다", () => {
    expect(getBookingStatus([makePerformance({ startsAt: PAST })])).toBe("ended");
  });

  it("모든 예매 오픈이 미래이면 upcoming을 반환한다", () => {
    expect(getBookingStatus([makePerformance({ bookingOpensAt: FUTURE })])).toBe("upcoming");
  });

  it("예매 가능한 공연이 있으면 available을 반환한다", () => {
    expect(getBookingStatus([makePerformance()])).toBe("available");
  });

  it("과거 공연과 미래 공연이 섞여 있고 미래 공연의 예매가 열리지 않았으면 upcoming을 반환한다", () => {
    const performances = [
      makePerformance({ startsAt: PAST, bookingOpensAt: PAST }),
      makePerformance({ id: 2, startsAt: FUTURE, bookingOpensAt: FUTURE }),
    ];
    expect(getBookingStatus(performances)).toBe("upcoming");
  });

  it("bookingOpensAt이 없는 미래 공연은 예매 오픈으로 간주해 available을 반환한다", () => {
    expect(getBookingStatus([makePerformance({ bookingOpensAt: undefined })])).toBe("available");
  });
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
