import type { PointerEvent } from "react";

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
  target?: EventTarget;
}

const createPointerEvent = (pointerId: number, clientX: number, clientY: number, options: PointerEventOptions = {}) =>
  ({
    pointerId,
    pointerType: options.pointerType ?? "touch",
    button: options.button ?? 0,
    clientX,
    clientY,
    currentTarget: mapElement,
    target: options.target ?? mapElement,
  }) as PointerEvent<SVGSVGElement>;

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

  it("SVG 밖에서 pointerup이 발생해도 추적 중인 포인터를 정리한다", () => {
    const { result } = renderHook(() => useVenueMapViewport({ width: 100, height: 100 }));

    act(() => {
      result.current.zoomIn();
      result.current.handlePointerDown(createPointerEvent(1, 50, 50));
      window.dispatchEvent(new PointerEvent("pointerup", { pointerId: 1 }));

      result.current.handlePointerDown(createPointerEvent(2, 50, 50));
      result.current.handlePointerMove(createPointerEvent(2, 30, 50));
    });

    expect(result.current.zoom).toBe(1.2);
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

  it("venue-form과 같은 최소 가시 영역을 기준으로 최대 확대를 제한한다", () => {
    const { result } = renderHook(() => useVenueMapViewport({ width: 100, height: 100 }));

    act(() => {
      for (let index = 0; index < 10; index += 1) {
        result.current.zoomIn();
      }
    });

    expect(result.current.zoom).toBe(2);
    expect(result.current.canZoomIn).toBe(false);
  });

  it("좌석에서 시작한 포인터도 지도 드래그로 전환할 수 있다", () => {
    const { result } = renderHook(() => useVenueMapViewport({ width: 100, height: 100 }));
    const seatElement = document.createElementNS("http://www.w3.org/2000/svg", "rect");

    seatElement.setAttribute("data-seat-id", "1");

    act(() => {
      result.current.handlePointerDown(
        createPointerEvent(1, 50, 50, {
          pointerType: "mouse",
          target: seatElement,
        }),
      );
    });

    expect(mockSetPointerCapture).not.toHaveBeenCalled();

    act(() => {
      result.current.handlePointerMove(
        createPointerEvent(1, 40, 50, {
          pointerType: "mouse",
          target: seatElement,
        }),
      );
      result.current.handlePointerUp(
        createPointerEvent(1, 40, 50, {
          pointerType: "mouse",
          target: seatElement,
        }),
      );
    });

    expect(mockSetPointerCapture).toHaveBeenCalledWith(1);
    expect(result.current.consumeSeatClick()).toBe(true);
  });

  it("좌석에서 이동하지 않고 포인터를 떼면 클릭을 허용한다", () => {
    const { result } = renderHook(() => useVenueMapViewport({ width: 100, height: 100 }));
    const seatElement = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    seatElement.setAttribute("data-seat-id", "1");
    const event = createPointerEvent(1, 50, 50, {
      pointerType: "mouse",
      target: seatElement,
    });

    act(() => {
      result.current.handlePointerDown(event);
      result.current.handlePointerUp(event);
    });

    expect(mockSetPointerCapture).not.toHaveBeenCalled();
    expect(result.current.consumeSeatClick()).toBe(false);
  });

  it("기본 배율에서 누른 포인터도 확대 후 이동하면 드래그로 전환한다", () => {
    const { result } = renderHook(() => useVenueMapViewport({ width: 100, height: 100 }));

    act(() => {
      result.current.handlePointerDown(createPointerEvent(1, 50, 50));
      result.current.zoomIn();
    });

    const viewBoxBeforeMove = result.current.viewBox;

    act(() => {
      result.current.handlePointerMove(createPointerEvent(1, 30, 50));
    });

    expect(result.current.isDragging).toBe(true);
    expect(result.current.viewBox).not.toBe(viewBoxBeforeMove);

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

  it("공연장 크기가 줄어 최대 배율이 낮아지면 현재 배율을 제한한다", () => {
    const { result, rerender } = renderHook(({ width, height }) => useVenueMapViewport({ width, height }), {
      initialProps: { width: 100, height: 100 },
    });
    act(() => {
      result.current.zoomIn();
      result.current.zoomIn();
      result.current.zoomIn();
    });

    rerender({ width: 30, height: 30 });
    expect(result.current.zoom).toBe(1);
  });

  it("pinch가 끝나 pan gesture가 없는 남은 포인터 이동을 무시한다", () => {
    const { result } = renderHook(() => useVenueMapViewport({ width: 100, height: 100 }));
    act(() => {
      result.current.handlePointerDown(createPointerEvent(1, 20, 50));
      result.current.handlePointerDown(createPointerEvent(2, 80, 50));
      result.current.handlePointerUp(createPointerEvent(2, 80, 50));
      result.current.handlePointerMove(createPointerEvent(1, 30, 50));
    });

    expect(result.current.isDragging).toBe(false);
  });
});
