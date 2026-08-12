import { renderHook } from "@testing-library/react";

import type { ConcertResponse, PerformanceResponse } from "@entities/concert";

import { useConcertCard } from "@features/concert/model/use-concert-card";

const FUTURE = new Date("2099-01-01");
const PAST = new Date("2000-01-01");

const makePerf = (overrides: Partial<PerformanceResponse> = {}): PerformanceResponse => ({
  id: 1,
  concertId: 1,
  startsAt: FUTURE,
  createdAt: new Date("2026-01-01"),
  totalSeats: 100,
  bookedSeats: 0,
  ...overrides,
});

const makeConcert = (overrides: Partial<ConcertResponse> = {}): ConcertResponse => ({
  id: 1,
  title: "테스트 콘서트",
  placeName: "올림픽공원",
  posterUrl: "https://example.com/poster.jpg",
  createdAt: new Date("2026-01-01"),
  performances: [makePerf()],
  ...overrides,
});

describe("useConcertCard", () => {
  it("콘서트 기본 정보(title, placeName, posterUrl)를 반환한다", () => {
    const { result } = renderHook(() => useConcertCard({ concert: makeConcert() }));

    expect(result.current.title).toBe("테스트 콘서트");
    expect(result.current.placeName).toBe("올림픽공원");
    expect(result.current.posterUrl).toBe("https://example.com/poster.jpg");
  });

  it("공연 기간 문자열을 반환한다", () => {
    const { result } = renderHook(() => useConcertCard({ concert: makeConcert() }));
    const d = FUTURE.toLocaleDateString();
    expect(result.current.period).toBe(`${d} ~ ${d}`);
  });

  it("available 상태의 statusLabel과 statusClassName을 반환한다", () => {
    const { result } = renderHook(() => useConcertCard({ concert: makeConcert() }));

    expect(result.current.statusLabel).toBe("예매 중");
    expect(result.current.statusClassName).toContain("bg-emerald-500");
  });

  it("soldout 상태의 statusLabel과 statusClassName을 반환한다", () => {
    const concert = makeConcert({ performances: [makePerf({ bookedSeats: 100 })] });
    const { result } = renderHook(() => useConcertCard({ concert }));

    expect(result.current.statusLabel).toBe("매진");
    expect(result.current.statusClassName).toContain("bg-red-500");
  });

  it("ended 상태의 statusLabel과 statusClassName을 반환한다", () => {
    const concert = makeConcert({ performances: [makePerf({ startsAt: PAST })] });
    const { result } = renderHook(() => useConcertCard({ concert }));

    expect(result.current.statusLabel).toBe("공연 종료");
    expect(result.current.statusClassName).toContain("bg-gray-400");
  });

  it("upcoming 상태의 statusLabel을 반환한다", () => {
    const concert = makeConcert({ performances: [makePerf({ bookingOpensAt: FUTURE })] });
    const { result } = renderHook(() => useConcertCard({ concert }));

    expect(result.current.statusLabel).toBe("오픈 예정");
    expect(result.current.statusClassName).toContain("bg-violet-600");
  });
});
