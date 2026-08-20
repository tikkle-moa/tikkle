import { act, renderHook } from "@testing-library/react";

import { useMobileConcertListFilterToggle } from "@pages/concertList/model/use-mobile-concert-list-filter-toggle";

describe("useMobileConcertListFilterToggle", () => {
  it("초기에는 모바일 필터 패널이 닫힌 상태다", () => {
    const { result } = renderHook(() => useMobileConcertListFilterToggle());

    expect(result.current.isMobileFilterOpen).toBe(false);
  });

  it("토글 호출마다 모바일 필터 패널의 열림 상태를 전환한다", () => {
    const { result } = renderHook(() => useMobileConcertListFilterToggle());

    act(() => {
      result.current.toggleMobileFilter();
    });

    expect(result.current.isMobileFilterOpen).toBe(true);

    act(() => {
      result.current.toggleMobileFilter();
    });

    expect(result.current.isMobileFilterOpen).toBe(false);
  });
});
