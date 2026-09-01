import type { KeyboardEvent, PointerEvent } from "react";

import { act, renderHook } from "@testing-library/react";

import { useVenueMapViewport } from "@features/venue-map/model/use-venue-map-viewport";

const mockSetPointerCapture = vi.fn();

const mapElement = {
  setPointerCapture: mockSetPointerCapture,
  getBoundingClientRect: () => ({
    left: 0,
    top: 0,
    width: 100,
    height: 100,
  }),
} as unknown as SVGSVGElement;

interface PointerEventOptions {
  button?: number;
  pointerType?: "mouse" | "touch";
}

const createPointerEvent = (pointerId: number, clientX: number, clientY: number, options: PointerEventOptions = {}) =>
  ({
    pointerId,
    pointerType: options.pointerType ?? "touch",
    button: options.button ?? 0,
    clientX,
    clientY,
    currentTarget: mapElement,
  }) as PointerEvent<SVGSVGElement>;

const createKeyboardEvent = (key: string) => {
  const preventDefault = vi.fn();

  return {
    event: { key, preventDefault } as unknown as KeyboardEvent<SVGSVGElement>,
    preventDefault,
  };
};

describe("useVenueMapViewport", () => {
  beforeEach(() => {
    mockSetPointerCapture.mockClear();
  });

  it("두 손가락 사이 거리가 멀어지면 지도를 확대하고 좌석 클릭을 무시한다", () => {
    const { result } = renderHook(() => useVenueMapViewport({ width: 100, height: 100 }));

    act(() => {
      result.current.handlePointerDown(createPointerEvent(1, 10, 50));
      result.current.handlePointerDown(createPointerEvent(2, 90, 50));
      result.current.handlePointerMove(createPointerEvent(2, 100, 50));
    });

    expect(result.current.zoom).toBeCloseTo(1.125);

    act(() => {
      result.current.handlePointerUp(createPointerEvent(2, 100, 50));
    });

    expect(result.current.consumeSeatClick()).toBe(true);
  });

  it("확대와 축소 제어의 활성 상태를 제공한다", () => {
    const { result } = renderHook(() => useVenueMapViewport({ width: 100, height: 100 }));

    expect(result.current.canZoomIn).toBe(true);
    expect(result.current.canZoomOut).toBe(false);

    act(() => {
      result.current.zoomIn();
    });

    expect(result.current.zoom).toBe(1.2);
    expect(result.current.canZoomOut).toBe(true);

    act(() => {
      result.current.zoomOut();
    });

    expect(result.current.zoom).toBe(1);
    expect(result.current.canZoomOut).toBe(false);
  });

  it("키보드로 확대, 축소, 초기화한다", () => {
    const { result } = renderHook(() => useVenueMapViewport({ width: 100, height: 100 }));
    const plus = createKeyboardEvent("+");
    const underscore = createKeyboardEvent("_");
    const equal = createKeyboardEvent("=");
    const minus = createKeyboardEvent("-");
    const reset = createKeyboardEvent("0");

    act(() => {
      result.current.handleKeyDown(plus.event);
    });

    expect(plus.preventDefault).toHaveBeenCalledTimes(1);
    expect(result.current.zoom).toBe(1.2);

    act(() => {
      result.current.handleKeyDown(underscore.event);
    });

    expect(underscore.preventDefault).toHaveBeenCalledTimes(1);
    expect(result.current.zoom).toBe(1);

    act(() => {
      result.current.handleKeyDown(equal.event);
    });

    expect(equal.preventDefault).toHaveBeenCalledTimes(1);
    expect(result.current.zoom).toBe(1.2);

    act(() => {
      result.current.handleKeyDown(minus.event);
    });

    expect(minus.preventDefault).toHaveBeenCalledTimes(1);
    expect(result.current.zoom).toBe(1);

    act(() => {
      result.current.handleKeyDown(equal.event);
      result.current.handleKeyDown(reset.event);
    });

    expect(reset.preventDefault).toHaveBeenCalledTimes(1);
    expect(result.current.zoom).toBe(1);
    expect(result.current.viewBox).toBe("0 0 100 100");
  });

  it("pan gesture를 시작하지 않은 포인터 이동은 확대 후에도 무시한다", () => {
    const { result } = renderHook(() => useVenueMapViewport({ width: 100, height: 100 }));

    act(() => {
      result.current.handlePointerDown(createPointerEvent(1, 50, 50));
      result.current.zoomIn();
    });

    const viewBoxBeforeMove = result.current.viewBox;

    act(() => {
      result.current.handlePointerMove(createPointerEvent(1, 30, 50));
    });

    expect(result.current.isDragging).toBe(false);
    expect(result.current.viewBox).toBe(viewBoxBeforeMove);

    act(() => {
      result.current.handlePointerUp(createPointerEvent(1, 30, 50));
    });
  });

  it("보조 마우스 버튼과 임계값 미만 이동은 지도를 이동하지 않는다", () => {
    const { result } = renderHook(() => useVenueMapViewport({ width: 100, height: 100 }));

    act(() => {
      result.current.handlePointerDown(
        createPointerEvent(1, 50, 50, {
          pointerType: "mouse",
          button: 2,
        }),
      );
    });

    expect(mockSetPointerCapture).not.toHaveBeenCalled();

    act(() => {
      result.current.zoomIn();
    });

    const initialViewBox = result.current.viewBox;

    act(() => {
      result.current.handlePointerDown(
        createPointerEvent(2, 50, 50, {
          pointerType: "mouse",
        }),
      );
      result.current.handlePointerMove(
        createPointerEvent(2, 50.5, 50, {
          pointerType: "mouse",
        }),
      );
      result.current.handlePointerUp(
        createPointerEvent(2, 50.5, 50, {
          pointerType: "mouse",
        }),
      );
    });

    expect(result.current.isDragging).toBe(false);
    expect(result.current.viewBox).toBe(initialViewBox);
    expect(result.current.consumeSeatClick()).toBe(false);
  });
});
