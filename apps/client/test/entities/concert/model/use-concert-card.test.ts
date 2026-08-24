import { renderHook } from "@testing-library/react";

import { formatDate } from "@shared/lib/date.utils";

import type { ConcertResponse } from "@entities/concert";
import { useConcertCard } from "@entities/concert/model/use-concert-card";
import type { PerformanceResponse } from "@entities/performance";

const FUTURE = new Date("2099-01-01").toISOString();
const PAST = new Date("2000-01-01").toISOString();

const makePerformance = (overrides: Partial<PerformanceResponse> = {}): PerformanceResponse => ({
  id: 1,
  concertId: 1,
  startsAt: FUTURE,
  bookingOpensAt: null,
  createdAt: new Date("2026-01-01").toISOString(),
  ...overrides,
});

const makeConcert = (overrides: Partial<ConcertResponse> = {}): ConcertResponse => ({
  id: 1,
  title: "테스트 콘서트",
  genre: "BALLAD",
  placeName: "올림픽공원",
  posterUrl: "https://example.com/poster.jpg",
  description: "테스트 콘서트 설명",
  createdAt: new Date("2026-01-01").toISOString(),
  ...overrides,
});

describe("useConcertCard", () => {
  it("콘서트 기본 정보(title, placeName, posterUrl)를 반환한다", () => {
    const { result } = renderHook(() => useConcertCard({ concert: makeConcert(), performances: [makePerformance()] }));

    expect(result.current.title).toBe("테스트 콘서트");
    expect(result.current.placeName).toBe("올림픽공원");
    expect(result.current.posterUrl).toBe("https://example.com/poster.jpg");
  });

  it("공연 기간 문자열을 반환한다", () => {
    const { result } = renderHook(() => useConcertCard({ concert: makeConcert(), performances: [makePerformance()] }));
    const d = formatDate(FUTURE);
    expect(result.current.period).toBe(`${d} ~ ${d}`);
  });

  it("available 상태의 statusLabel과 statusClassName을 반환한다", () => {
    const { result } = renderHook(() => useConcertCard({ concert: makeConcert(), performances: [makePerformance()] }));

    expect(result.current.statusLabel).toBe("예매 중");
    expect(result.current.statusClassName).toContain("bg-emerald-500");
  });

  it("ended 상태의 statusLabel과 statusClassName을 반환한다", () => {
    const { result } = renderHook(() => useConcertCard({ concert: makeConcert(), performances: [makePerformance({ startsAt: PAST })] }));

    expect(result.current.statusLabel).toBe("공연 종료");
    expect(result.current.statusClassName).toContain("bg-gray-400");
  });

  it("upcoming 상태의 statusLabel을 반환한다", () => {
    const { result } = renderHook(() => useConcertCard({ concert: makeConcert(), performances: [makePerformance({ bookingOpensAt: FUTURE })] }));

    expect(result.current.statusLabel).toBe("오픈 예정");
    expect(result.current.statusClassName).toContain("bg-violet-600");
  });
});
