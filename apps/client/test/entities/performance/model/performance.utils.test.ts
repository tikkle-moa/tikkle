import { formatDate } from "@shared/lib/date.utils";

import { getPerformanceStatus, getPeriod } from "@entities/performance";
import type { PerformanceResponse } from "@entities/performance";

const makePerformance = (overrides: Partial<PerformanceResponse> = {}): PerformanceResponse => ({
  id: 1,
  concertId: 1,
  startsAt: new Date("2099-01-01").toISOString(),
  bookingOpensAt: null,
  createdAt: new Date("2026-01-01").toISOString(),
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

describe("getPerformanceStatus", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-26T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("공연 시작 시간이 지났으면 ended를 반환한다", () => {
    const performance = makePerformance({ startsAt: "2026-08-26T11:59:59Z" });

    expect(getPerformanceStatus(performance)).toBe("ended");
  });

  it("예매 오픈 전이면 upcoming을 반환한다", () => {
    const performance = makePerformance({
      startsAt: "2026-09-01T19:00:00Z",
      bookingOpensAt: "2026-08-27T12:00:00Z",
    });

    expect(getPerformanceStatus(performance)).toBe("upcoming");
  });

  it("예매가 이미 열렸으면 available을 반환한다", () => {
    const performance = makePerformance({
      startsAt: "2026-09-01T19:00:00Z",
      bookingOpensAt: "2026-08-25T12:00:00Z",
    });

    expect(getPerformanceStatus(performance)).toBe("available");
  });

  it("예매 오픈 일시가 없으면 available을 반환한다", () => {
    const performance = makePerformance({
      startsAt: "2026-09-01T19:00:00Z",
      bookingOpensAt: null,
    });

    expect(getPerformanceStatus(performance)).toBe("available");
  });
});
