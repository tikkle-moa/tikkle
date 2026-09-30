import { act, renderHook } from "@testing-library/react";

import { useVenueMap } from "@features/venue-map/model/use-venue-map";

describe("useVenueMap", () => {
  it("DOM 연결 전에도 좌석 선택과 viewport API를 함께 제공한다", () => {
    const { result } = renderHook(() => useVenueMap({ width: 100, height: 100 }));

    expect(result.current.selectedSeat).toBeNull();
    expect(result.current.viewBox).toBe("0 0 100 100");
    expect(result.current.zoom).toBe(1);
    expect(result.current.selectSeat).toEqual(expect.any(Function));
    expect(result.current.handleSeatKeyDown).toEqual(expect.any(Function));
    expect(result.current.zoomIn).toEqual(expect.any(Function));
    expect(result.current.zoomOut).toEqual(expect.any(Function));
    expect(result.current.handlePointerDown).toEqual(expect.any(Function));

    act(() => {
      result.current.zoomIn();
    });

    expect(result.current.zoom).toBe(1.2);
  });
});
