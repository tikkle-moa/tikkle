import { renderHook } from "@testing-library/react";

import type { ConcertListResponse } from "@entities/concert/model/concert.types";
import { useConcertCard } from "@entities/concert/model/use-concert-card";

const makeConcert = (overrides: Partial<ConcertListResponse> = {}): ConcertListResponse => ({
  id: 1,
  venueId: 1,
  title: "테스트 콘서트",
  genre: "BALLAD",
  venueName: "올림픽공원",
  posterUrl: "https://example.com/poster.jpg",
  createdAt: new Date("2026-01-01").toISOString(),
  ...overrides,
});

describe("useConcertCard", () => {
  it("콘서트 기본 정보(title, venueName, posterUrl)를 반환한다", () => {
    const { result } = renderHook(() => useConcertCard({ concert: makeConcert() }));

    expect(result.current.title).toBe("테스트 콘서트");
    expect(result.current.venueName).toBe("올림픽공원");
    expect(result.current.posterUrl).toBe("https://example.com/poster.jpg");
  });

  it("콘서트 장르에 맞는 아이콘, 라벨, 클래스명을 반환한다", () => {
    const { result } = renderHook(() => useConcertCard({ concert: makeConcert({ genre: "ROCK_METAL" }) }));

    expect(result.current.genreLabel).toBe("락/메탈");
    expect(result.current.genreClassName).toBe("bg-red-100 text-red-600");
    expect(result.current.GenreIcon).toBeDefined();
  });
});
