import { createRef } from "react";

import { act, renderHook } from "@testing-library/react";

import type { VenueSeatResponse } from "@entities/venue";

import { useVenueMapDragSelection } from "@features/venue-map/model/use-venue-map-drag-selection";

const seats = [
  { id: 1, positionX: 20, positionY: 20 },
  { id: 2, positionX: 80, positionY: 80 },
] as VenueSeatResponse[];

const createPointerEvent = (svg: SVGSVGElement, overrides: Record<string, unknown> = {}) =>
  ({
    altKey: true,
    shiftKey: false,
    button: 0,
    clientX: 10,
    clientY: 10,
    pointerId: 1,
    currentTarget: svg,
    target: svg,
    preventDefault: vi.fn(),
    ...overrides,
  }) as never;

describe("useVenueMapDragSelection", () => {
  it("SVG 좌표를 구할 수 없는 포인터 입력을 무시한다", () => {
    const svgRef = createRef<SVGSVGElement>();
    const { result } = renderHook(() =>
      useVenueMapDragSelection({
        svgRef,
        venueSeats: seats,
        enabled: true,
        onSeatSelectionChange: vi.fn(),
      }),
    );
    const detachedSvg = document.createElementNS("http://www.w3.org/2000/svg", "svg");

    expect(result.current.handlePointerDown(createPointerEvent(detachedSvg))).toBe(false);

    svgRef.current = detachedSvg;
    Object.defineProperty(detachedSvg, "getBoundingClientRect", {
      configurable: true,
      value: () => ({ left: 0, top: 0, width: 0, height: 0 }),
    });
    expect(result.current.handlePointerDown(createPointerEvent(detachedSvg))).toBe(false);
  });

  it("SVG matrix 좌표로 드래그하고 좌석에서 시작한 클릭을 한 번 소비한다", () => {
    vi.useFakeTimers();
    const svgRef = createRef<SVGSVGElement>();
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    const seatElement = document.createElementNS("http://www.w3.org/2000/svg", "g");
    seatElement.dataset.seatId = "1";
    const invalidSeatElement = document.createElementNS("http://www.w3.org/2000/svg", "g");
    invalidSeatElement.dataset.seatId = "invalid";
    svg.append(seatElement, invalidSeatElement);
    svgRef.current = svg;
    Object.defineProperties(svg, {
      setPointerCapture: { configurable: true, value: vi.fn() },
      getScreenCTM: { configurable: true, value: () => ({ inverse: () => ({}) }) },
      createSVGPoint: {
        configurable: true,
        value: () => ({
          x: 0,
          y: 0,
          matrixTransform: () => ({ x: 20, y: 20 }),
        }),
      },
    });
    const onSeatSelectionChange = vi.fn();
    const { result } = renderHook(() =>
      useVenueMapDragSelection({
        svgRef,
        venueSeats: seats,
        enabled: true,
        onSeatSelectionChange,
      }),
    );

    act(() => {
      expect(
        result.current.handlePointerDown(
          createPointerEvent(svg, {
            target: seatElement,
            shiftKey: true,
          }),
        ),
      ).toBe(true);
    });
    act(() => {
      expect(result.current.handlePointerUp(createPointerEvent(svg))).toBe(true);
    });

    expect(onSeatSelectionChange).toHaveBeenCalledWith(new Set([1]));
    expect(result.current.consumeSeatClick()).toBe(true);
    expect(result.current.consumeSeatClick()).toBe(false);

    act(() => {
      result.current.handlePointerDown(createPointerEvent(svg, { target: {} }));
      result.current.handlePointerMove(createPointerEvent(svg));
      result.current.handlePointerMove(createPointerEvent(svg, { clientX: 30 }));
      result.current.handlePointerCancel(createPointerEvent(svg));
    });
    act(() => vi.runAllTimers());
    vi.useRealTimers();
  });

  it("드래그 중 좌표를 잃으면 현재 영역을 유지하고 다른 포인터는 무시한다", () => {
    const svgRef = createRef<SVGSVGElement>();
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 100 100");
    svgRef.current = svg;
    Object.defineProperties(svg, {
      setPointerCapture: { configurable: true, value: vi.fn() },
      getBoundingClientRect: {
        configurable: true,
        value: () => ({ left: 0, top: 0, width: 100, height: 100 }),
      },
    });
    const { result } = renderHook(() =>
      useVenueMapDragSelection({
        svgRef,
        venueSeats: seats,
        selectedSeatIds: new Set([2]),
        enabled: true,
        onSeatSelectionChange: vi.fn(),
      }),
    );

    act(() => {
      result.current.handlePointerDown(createPointerEvent(svg));
    });
    expect(result.current.handlePointerMove(createPointerEvent(svg, { pointerId: 2 }))).toBe(false);

    svgRef.current = null;
    expect(result.current.handlePointerMove(createPointerEvent(svg))).toBe(true);
    act(() => {
      expect(result.current.handlePointerCancel(createPointerEvent(svg))).toBe(true);
    });
    expect(result.current.handlePointerUp(createPointerEvent(svg))).toBe(false);
  });
});
