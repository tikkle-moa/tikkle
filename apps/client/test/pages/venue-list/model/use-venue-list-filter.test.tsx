import type { PropsWithChildren } from "react";
import { MemoryRouter, useLocation } from "react-router";

import { act, renderHook } from "@testing-library/react";

import { useVenueListFilter } from "@pages/venue-list/model/use-venue-list-filter";

const makeWrapper = (initialEntry = "/venues") =>
  function Wrapper({ children }: PropsWithChildren) {
    return <MemoryRouter initialEntries={[initialEntry]}>{children}</MemoryRouter>;
  };

describe("useVenueListFilter", () => {
  it("URL 필터를 복원하고 유효하지 않은 값에는 기본값을 적용한다", () => {
    const { result } = renderHook(() => useVenueListFilter(), {
      wrapper: makeWrapper("/venues?keyword=홀&region=서울&region=부산&minCapacity=100&sort=capacity&direction=desc"),
    });

    expect(result.current).toMatchObject({
      searchValue: "홀",
      searchKeyword: "홀",
      selectedRegions: ["서울", "부산"],
      minCapacity: 100,
      sort: "capacity",
      sortDirection: "desc",
      activeFilterCount: 4,
      isMobileFilterOpen: false,
    });

    const invalid = renderHook(() => useVenueListFilter(), {
      wrapper: makeWrapper("/venues?minCapacity=-1&sort=nope&direction=nope"),
    });
    expect(invalid.result.current).toMatchObject({ minCapacity: 0, sort: "name", sortDirection: "asc" });
  });

  it("검색어를 추가하고 제거한다", () => {
    const { result } = renderHook(() => ({ filter: useVenueListFilter(), location: useLocation() }), { wrapper: makeWrapper() });

    act(() => result.current.filter.handleSearchInputChange({ target: { value: "아레나" } } as React.ChangeEvent<HTMLInputElement>));
    expect(result.current.filter.searchValue).toBe("아레나");
    expect(result.current.location.search).toContain("keyword=");

    act(() => result.current.filter.handleSearchInputChange({ target: { value: "" } } as React.ChangeEvent<HTMLInputElement>));
    expect(result.current.location.search).toBe("");
  });

  it("지역을 추가 및 제거하고 모바일 필터를 토글한다", () => {
    const { result } = renderHook(() => ({ filter: useVenueListFilter(), location: useLocation() }), { wrapper: makeWrapper() });

    act(() => result.current.filter.toggleMobileFilter());
    expect(result.current.filter.isMobileFilterOpen).toBe(true);
    act(() => result.current.filter.toggleRegion("서울"));
    expect(result.current.filter.selectedRegions).toEqual(["서울"]);
    act(() => result.current.filter.toggleRegion("부산"));
    expect(result.current.filter.selectedRegions).toEqual(["서울", "부산"]);
    act(() => result.current.filter.toggleRegion("서울"));
    expect(result.current.filter.selectedRegions).toEqual(["부산"]);
  });

  it("최소 수용 인원을 추가하고 잘못된 값은 제거한다", () => {
    const { result } = renderHook(() => useVenueListFilter(), { wrapper: makeWrapper() });

    act(() => result.current.changeMinCapacity(300));
    expect(result.current.minCapacity).toBe(300);
    act(() => result.current.changeMinCapacity(1.5));
    expect(result.current.minCapacity).toBe(0);
    act(() => result.current.changeMinCapacity(0));
    expect(result.current.minCapacity).toBe(0);
  });

  it("정렬 기준과 방향을 추가하고 기본값이면 URL에서 제거한다", () => {
    const { result } = renderHook(() => ({ filter: useVenueListFilter(), location: useLocation() }), { wrapper: makeWrapper() });

    act(() => result.current.filter.changeSort("popular"));
    act(() => result.current.filter.changeSortDirection("desc"));
    expect(result.current.location.search).toContain("sort=popular");
    expect(result.current.location.search).toContain("direction=desc");

    act(() => result.current.filter.changeSort("name"));
    act(() => result.current.filter.changeSortDirection("asc"));
    expect(result.current.location.search).toBe("");
  });

  it("초기화 시 필터만 제거하고 정렬은 유지한다", () => {
    const { result } = renderHook(() => ({ filter: useVenueListFilter(), location: useLocation() }), {
      wrapper: makeWrapper("/venues?keyword=홀&region=서울&minCapacity=100&sort=popular&direction=asc"),
    });

    act(() => result.current.filter.clearFilters());

    expect(result.current.location.search).toBe("?sort=popular&direction=asc");
    expect(result.current.filter.searchValue).toBe("");
  });
});
