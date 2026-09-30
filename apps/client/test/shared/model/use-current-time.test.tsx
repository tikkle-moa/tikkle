import { act, renderHook } from "@testing-library/react";

import { useCurrentTime } from "@shared/model/use-current-time";

describe("useCurrentTime", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-18T07:00:00"));
  });

  afterEach(() => vi.useRealTimers());

  it("구독자에게 현재 시각을 알리고 마지막 구독 해제 시 interval을 정리한다", () => {
    const clearInterval = vi.spyOn(window, "clearInterval");
    const first = renderHook(() => useCurrentTime());
    const second = renderHook(() => useCurrentTime());
    const initial = first.result.current;

    act(() => {
      vi.setSystemTime(new Date("2026-09-18T07:00:01"));
      vi.advanceTimersByTime(1000);
    });
    expect(first.result.current).toBeGreaterThan(initial);
    expect(second.result.current).toBe(first.result.current);

    first.unmount();
    expect(clearInterval).not.toHaveBeenCalled();
    second.unmount();
    expect(clearInterval).toHaveBeenCalledOnce();
  });
});
