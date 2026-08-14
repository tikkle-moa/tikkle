import type { ConcertResponse, PerformanceResponse } from "@entities/concert";
import { getBookingStatus, getPeriod } from "@entities/concert";

const PAST = new Date("2000-01-01");
const FUTURE = new Date("2099-01-01");

const makePerf = (overrides: Partial<PerformanceResponse> = {}): PerformanceResponse => ({
  id: 1,
  concertId: 1,
  startsAt: FUTURE,
  createdAt: new Date("2026-01-01"),
  totalSeats: 100,
  bookedSeats: 0,
  ...overrides,
});

const makeConcert = (performances: PerformanceResponse[]): ConcertResponse => ({
  id: 1,
  title: "테스트 콘서트",
  genre: "ballad",
  placeName: "올림픽공원",
  createdAt: new Date("2026-01-01"),
  performances,
});

describe("getBookingStatus", () => {
  it("모든 공연이 과거이면 ended를 반환한다", () => {
    expect(getBookingStatus(makeConcert([makePerf({ startsAt: PAST })]))).toBe("ended");
  });

  it("모든 예매 오픈이 미래이면 upcoming을 반환한다", () => {
    expect(getBookingStatus(makeConcert([makePerf({ bookingOpensAt: FUTURE })]))).toBe("upcoming");
  });

  it("모든 좌석이 매진이면 soldout을 반환한다", () => {
    expect(getBookingStatus(makeConcert([makePerf({ bookedSeats: 100 })]))).toBe("soldout");
  });

  it("예매 가능한 공연이 있으면 available을 반환한다", () => {
    expect(getBookingStatus(makeConcert([makePerf()]))).toBe("available");
  });

  it("ended는 soldout보다 우선한다", () => {
    expect(getBookingStatus(makeConcert([makePerf({ startsAt: PAST, bookedSeats: 100 })]))).toBe("ended");
  });

  it("과거 공연과 미래 공연이 섞여 있고 미래 공연의 예매가 열리지 않았으면 upcoming을 반환한다", () => {
    const perfs = [makePerf({ startsAt: PAST, bookingOpensAt: PAST }), makePerf({ id: 2, startsAt: FUTURE, bookingOpensAt: FUTURE })];
    expect(getBookingStatus(makeConcert(perfs))).toBe("upcoming");
  });

  it("bookingOpensAt이 없는 미래 공연은 예매 오픈으로 간주해 available을 반환한다", () => {
    expect(getBookingStatus(makeConcert([makePerf({ bookingOpensAt: undefined })]))).toBe("available");
  });

  it("예매 오픈일이 지난 미래 공연이 모두 매진이면 soldout을 반환한다", () => {
    expect(getBookingStatus(makeConcert([makePerf({ bookingOpensAt: PAST, bookedSeats: 100 })]))).toBe("soldout");
  });
});

describe("getPeriod", () => {
  it("빈 배열이면 빈 문자열을 반환한다", () => {
    expect(getPeriod([])).toBe("");
  });

  it("단일 공연의 날짜를 형식화한다", () => {
    const d = new Date("2026-10-01");
    const formatted = d.toLocaleDateString();
    expect(getPeriod([makePerf({ startsAt: d })])).toBe(`${formatted} ~ ${formatted}`);
  });

  it("복수 공연 중 가장 빠른 날짜와 가장 늦은 날짜를 반환한다", () => {
    const perfs = [
      makePerf({ id: 1, startsAt: new Date("2026-10-03") }),
      makePerf({ id: 2, startsAt: new Date("2026-10-01") }),
      makePerf({ id: 3, startsAt: new Date("2026-10-05") }),
    ];
    const first = new Date("2026-10-01").toLocaleDateString();
    const last = new Date("2026-10-05").toLocaleDateString();
    expect(getPeriod(perfs)).toBe(`${first} ~ ${last}`);
  });
});
