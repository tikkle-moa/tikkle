import type { PointerEvent } from "react";

import { act, renderHook } from "@testing-library/react";

import { useVenueMapViewport } from "@features/venue-map/model/use-venue-map-viewport";

const createEvent = (target: SVGSVGElement, pointerId: number, x: number, y: number) =>
  ({ pointerId, pointerType: "mouse", button: 0, clientX: x, clientY: y, currentTarget: target, target }) as unknown as PointerEvent<SVGSVGElement>;

describe("useVenueMapViewport drag rendering", () => {
  afterEach(() => vi.restoreAllMocks());

  it("direct rendering pan과 pending frame을 처리한다", () => {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.getBoundingClientRect = () => ({ left: 0, top: 0, width: 100, height: 100 }) as DOMRect;
    svg.setPointerCapture = vi.fn();
    const { result } = renderHook(() => useVenueMapViewport({ width: 100, height: 100, directDragRendering: true }));
    result.current.svgRef.current = svg;

    act(() => result.current.zoomIn());
    act(() => result.current.handlePointerDown(createEvent(svg, 1, 50, 50)));
    act(() => result.current.handlePointerMove(createEvent(svg, 1, 20, 50)));
    act(() => result.current.handlePointerMove(createEvent(svg, 1, 10, 50)));
    act(() => result.current.handlePointerUp(createEvent(svg, 1, 10, 50)));

    expect(svg.getAttribute("viewBox")).toBeTruthy();
    expect(result.current.consumeSeatClick()).toBe(true);
  });

  it("pending frame을 실행하고 렌더링 모드가 바뀌면 React viewport로 flush한다", () => {
    let frameCallback: FrameRequestCallback | undefined;
    const requestAnimationFrame = vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => {
      frameCallback = callback;
      return 7;
    });
    const cancelAnimationFrame = vi.spyOn(window, "cancelAnimationFrame").mockImplementation(() => {});
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.getBoundingClientRect = () => ({ left: 0, top: 0, width: 100, height: 100 }) as DOMRect;
    svg.setPointerCapture = vi.fn();
    const { result, rerender } = renderHook(({ directDragRendering }) => useVenueMapViewport({ width: 100, height: 100, directDragRendering }), {
      initialProps: { directDragRendering: true },
    });
    result.current.svgRef.current = svg;

    act(() => {
      result.current.zoomIn();
      result.current.handlePointerDown(createEvent(svg, 1, 50, 50));
      result.current.handlePointerMove(createEvent(svg, 1, 20, 50));
      result.current.handlePointerMove(createEvent(svg, 1, 10, 50));
      result.current.handlePointerMove(createEvent(svg, 1, 5, 50));
    });

    expect(requestAnimationFrame).toHaveBeenCalledOnce();
    act(() => frameCallback?.(0));

    act(() => {
      result.current.handlePointerMove(createEvent(svg, 1, 0, 50));
      rerender({ directDragRendering: false });
      result.current.handlePointerUp(createEvent(svg, 1, 0, 50));
    });

    expect(cancelAnimationFrame).toHaveBeenCalledWith(7);
    expect(result.current.viewBox).not.toBe("0 0 100 100");
    act(() => frameCallback?.(0));
  });

  it("예약된 viewport frame은 언마운트 시 취소한다", () => {
    let frameCallback: FrameRequestCallback | undefined;
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => {
      frameCallback = callback;
      return 11;
    });
    const cancelAnimationFrame = vi.spyOn(window, "cancelAnimationFrame").mockImplementation(() => {});
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.getBoundingClientRect = () => ({ left: 0, top: 0, width: 100, height: 100 }) as DOMRect;
    svg.setPointerCapture = vi.fn();
    const { result, unmount } = renderHook(() => useVenueMapViewport({ width: 100, height: 100, directDragRendering: true }));
    result.current.svgRef.current = svg;

    act(() => {
      result.current.zoomIn();
      result.current.handlePointerDown(createEvent(svg, 1, 50, 50));
      result.current.handlePointerMove(createEvent(svg, 1, 20, 50));
      result.current.handlePointerMove(createEvent(svg, 1, 10, 50));
    });

    expect(frameCallback).toBeDefined();
    unmount();
    expect(cancelAnimationFrame).toHaveBeenCalledWith(11);
  });

  it("직접 렌더링을 끄면 대기 중인 viewport를 React 상태로 반영한다", () => {
    vi.spyOn(window, "requestAnimationFrame").mockImplementation(() => 13);
    vi.spyOn(window, "cancelAnimationFrame").mockImplementation(() => {});
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.getBoundingClientRect = () => ({ left: 0, top: 0, width: 100, height: 100 }) as DOMRect;
    svg.setPointerCapture = vi.fn();
    const { result, rerender } = renderHook(({ directDragRendering }) => useVenueMapViewport({ width: 100, height: 100, directDragRendering }), {
      initialProps: { directDragRendering: true },
    });
    result.current.svgRef.current = svg;

    act(() => {
      result.current.zoomIn();
      result.current.handlePointerDown(createEvent(svg, 1, 50, 50));
      result.current.handlePointerMove(createEvent(svg, 1, 20, 50));
      result.current.handlePointerMove(createEvent(svg, 1, 10, 50));
    });
    rerender({ directDragRendering: false });

    act(() => result.current.handlePointerUp(createEvent(svg, 1, 10, 50)));

    expect(result.current.viewBox).not.toBe("0 0 100 100");
  });

  it("trackDragging false에서는 drag 상태를 표시하지 않는다", () => {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.getBoundingClientRect = () => ({ left: 0, top: 0, width: 100, height: 100 }) as DOMRect;
    svg.setPointerCapture = vi.fn();
    const { result } = renderHook(() => useVenueMapViewport({ width: 100, height: 100, trackDragging: false }));

    act(() => result.current.zoomIn());
    act(() => result.current.handlePointerDown(createEvent(svg, 1, 50, 50)));
    act(() => result.current.handlePointerMove(createEvent(svg, 1, 10, 50)));
    expect(result.current.isDragging).toBe(false);
  });

  it("direct rendering pinch를 처리한다", () => {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.getBoundingClientRect = () => ({ left: 0, top: 0, width: 100, height: 100 }) as DOMRect;
    svg.setPointerCapture = vi.fn();
    const { result } = renderHook(() => useVenueMapViewport({ width: 100, height: 100, directDragRendering: true }));
    result.current.svgRef.current = svg;

    act(() => {
      result.current.handlePointerDown(createEvent(svg, 1, 20, 50));
      result.current.handlePointerDown(createEvent(svg, 2, 80, 50));
      result.current.handlePointerMove(createEvent(svg, 2, 90, 50));
      result.current.handlePointerUp(createEvent(svg, 2, 90, 50));
      result.current.handlePointerUp(createEvent(svg, 1, 20, 50));
    });

    expect(result.current.zoom).toBeGreaterThan(1);
  });

  it("pinch tracking을 끄면 dragging 상태를 갱신하지 않는다", () => {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.getBoundingClientRect = () => ({ left: 0, top: 0, width: 100, height: 100 }) as DOMRect;
    svg.setPointerCapture = vi.fn();
    const { result } = renderHook(() => useVenueMapViewport({ width: 100, height: 100, trackDragging: false }));

    act(() => {
      result.current.handlePointerDown(createEvent(svg, 1, 20, 50));
      result.current.handlePointerDown(createEvent(svg, 2, 80, 50));
      result.current.handlePointerMove(createEvent(svg, 2, 90, 50));
    });

    expect(result.current.isDragging).toBe(false);
  });
});
