import type { PropsWithChildren } from "react";
import { MemoryRouter, useLocation } from "react-router";

import { act, renderHook, screen } from "@testing-library/react";

import { useConcertListFilterSearchParams } from "@pages/concert-list/model/use-concert-list-filter-search-params";

const SearchParamsObserver = () => {
  const { search } = useLocation();

  return <output data-testid="search-params">{search}</output>;
};

const createRouterWrapper = (initialEntry: string) => {
  const RouterWrapper = ({ children }: PropsWithChildren) => (
    <MemoryRouter initialEntries={[initialEntry]}>
      {children}
      <SearchParamsObserver />
    </MemoryRouter>
  );

  return RouterWrapper;
};

const getCurrentSearchParams = () => {
  const search = screen.getByTestId("search-params").textContent ?? "";

  return new URLSearchParams(search);
};

describe("useConcertListFilterSearchParams", () => {
  it("URL 쿼리에서 선택된 필터와 필터 수를 복원한다", () => {
    const { result } = renderHook(() => useConcertListFilterSearchParams(), {
      wrapper: createRouterWrapper("/concerts?genre=BALLAD&genre=ROCK_METAL&status=available&dateFrom=2026-08-20&dateTo=2026-08-31"),
    });

    expect(result.current.selectedGenres).toEqual(["BALLAD", "ROCK_METAL"]);
    expect(result.current.selectedBookingStatuses).toEqual(["available"]);
    expect(result.current.startDate).toBe("2026-08-20");
    expect(result.current.endDate).toBe("2026-08-31");
    expect(result.current.activeFilterCount).toBe(4);
  });

  it("장르 선택을 URL 쿼리에 추가하고 해제한다", () => {
    const { result } = renderHook(() => useConcertListFilterSearchParams(), {
      wrapper: createRouterWrapper("/concerts?q=아이유&genre=BALLAD"),
    });

    act(() => {
      result.current.toggleGenre("ROCK_METAL");
    });

    expect(result.current.selectedGenres).toEqual(["BALLAD", "ROCK_METAL"]);

    const selectedSearchParams = getCurrentSearchParams();

    expect(selectedSearchParams.get("q")).toBe("아이유");
    expect(selectedSearchParams.getAll("genre")).toEqual(["BALLAD", "ROCK_METAL"]);

    act(() => {
      result.current.toggleGenre("BALLAD");
    });

    expect(result.current.selectedGenres).toEqual(["ROCK_METAL"]);

    const unselectedSearchParams = getCurrentSearchParams();

    expect(unselectedSearchParams.get("q")).toBe("아이유");
    expect(unselectedSearchParams.getAll("genre")).toEqual(["ROCK_METAL"]);
  });

  it("예매 상태 선택을 URL 쿼리에 추가하고 해제한다", () => {
    const { result } = renderHook(() => useConcertListFilterSearchParams(), {
      wrapper: createRouterWrapper("/concerts?q=아이유&status=available"),
    });

    act(() => {
      result.current.toggleBookingStatus("sold-out");
    });

    expect(result.current.selectedBookingStatuses).toEqual(["available", "sold-out"]);

    const selectedSearchParams = getCurrentSearchParams();

    expect(selectedSearchParams.get("q")).toBe("아이유");
    expect(selectedSearchParams.getAll("status")).toEqual(["available", "sold-out"]);

    act(() => {
      result.current.toggleBookingStatus("available");
    });

    expect(result.current.selectedBookingStatuses).toEqual(["sold-out"]);

    const unselectedSearchParams = getCurrentSearchParams();

    expect(unselectedSearchParams.get("q")).toBe("아이유");
    expect(unselectedSearchParams.getAll("status")).toEqual(["sold-out"]);
  });

  it("공연일 범위 변경을 URL 쿼리에 반영한다", () => {
    const { result } = renderHook(() => useConcertListFilterSearchParams(), {
      wrapper: createRouterWrapper("/concerts"),
    });

    act(() => {
      result.current.changeStartDate("2026-08-20");
    });

    expect(result.current.startDate).toBe("2026-08-20");

    act(() => {
      result.current.changeEndDate("2026-08-31");
    });

    expect(result.current.endDate).toBe("2026-08-31");
    expect(result.current.activeFilterCount).toBe(1);

    const searchParams = getCurrentSearchParams();

    expect(searchParams.get("dateFrom")).toBe("2026-08-20");
    expect(searchParams.get("dateTo")).toBe("2026-08-31");
  });

  it("빈 공연일을 입력하면 해당 날짜 쿼리를 제거한다", () => {
    const { result } = renderHook(() => useConcertListFilterSearchParams(), {
      wrapper: createRouterWrapper("/concerts?q=아이유&dateFrom=2026-08-20&dateTo=2026-08-31"),
    });

    act(() => {
      result.current.changeEndDate("");
    });

    expect(result.current.endDate).toBe("");

    const searchParams = getCurrentSearchParams();

    expect(searchParams.get("q")).toBe("아이유");
    expect(searchParams.get("dateFrom")).toBe("2026-08-20");
    expect(searchParams.get("dateTo")).toBeNull();
  });

  it("초기화 시 필터 쿼리만 제거하고 검색어는 유지한다", () => {
    const { result } = renderHook(() => useConcertListFilterSearchParams(), {
      wrapper: createRouterWrapper("/concerts?q=아이유&genre=BALLAD&status=available&dateFrom=2026-08-20&dateTo=2026-08-31"),
    });

    act(() => {
      result.current.clearFilters();
    });

    const searchParams = getCurrentSearchParams();

    expect(searchParams.get("q")).toBe("아이유");
    expect(searchParams.getAll("genre")).toEqual([]);
    expect(searchParams.getAll("status")).toEqual([]);
    expect(searchParams.get("dateFrom")).toBeNull();
    expect(searchParams.get("dateTo")).toBeNull();
  });
});
