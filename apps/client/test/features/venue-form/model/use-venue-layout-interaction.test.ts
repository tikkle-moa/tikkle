import type { PointerEvent as ReactPointerEvent } from "react";

import { act, renderHook } from "@testing-library/react";

import type { CreateVenueRequest, CreateVenueSeatRequest } from "@entities/venue";

import { useVenueLayoutInteraction } from "@features/venue-form/model/use-venue-layout-interaction";
import { VENUE_LAYOUT_MIN_VISIBLE_SIZE } from "@features/venue-form/model/venue-layout.constants";

const venue: CreateVenueRequest = {
  name: "공연장",
  address: "서울시",
  description: null,
  width: 100,
  height: 100,
  stagePositionX: 50,
  stagePositionY: 10,
  stageWidth: 40,
  stageHeight: 10,
};

const venueSeats: CreateVenueSeatRequest[] = [
  { sectionName: "A", seatNumber: 1, seatLabel: "A1", price: 10_000, positionX: 20, positionY: 30 },
  { sectionName: "B", seatNumber: 1, seatLabel: "B1", price: 20_000, positionX: 40, positionY: 30 },
  { sectionName: "A", seatNumber: 2, seatLabel: "A2", price: 10_000, positionX: 60, positionY: 30 },
];

const createPointerEvent = (timeStamp: number) =>
  ({
    timeStamp,
    pointerId: 1,
    clientX: 20,
    clientY: 30,
    shiftKey: false,
    preventDefault: vi.fn(),
    stopPropagation: vi.fn(),
  }) as unknown as ReactPointerEvent<SVGElement>;

const createFullPointerEvent = (overrides: Record<string, unknown> = {}) =>
  ({
    timeStamp: 1_000,
    pointerId: 1,
    clientX: 20,
    clientY: 30,
    button: 0,
    shiftKey: false,
    altKey: false,
    preventDefault: vi.fn(),
    stopPropagation: vi.fn(),
    currentTarget: { getBoundingClientRect: () => ({ width: 100, height: 100 }) },
    ...overrides,
  }) as unknown as ReactPointerEvent<SVGSVGElement>;

const renderInteraction = () => {
  const setSelectedSeatIndices = vi.fn();
  const props = {
    venue,
    venueSeats,
    selectedSeatIndices: [] as number[],
    isSubmitting: false,
    setVenue: vi.fn(),
    setVenueSeats: vi.fn(),
    setErrors: vi.fn(),
    setSelectedSeatIndices,
    onLayoutChangeStart: vi.fn(),
  };
  return { ...renderHook(() => useVenueLayoutInteraction(props)), props };
};

const attachCoordinateSvg = (result: ReturnType<typeof renderInteraction>["result"]) => {
  result.current.svgRef.current = {
    focus: vi.fn(),
    setPointerCapture: vi.fn(),
    createSVGPoint: () => ({
      x: 0,
      y: 0,
      matrixTransform() {
        return { x: this.x, y: this.y };
      },
    }),
    getScreenCTM: () => ({ inverse: () => ({}) }),
  } as never;
};

describe("useVenueLayoutInteraction", () => {
  it("같은 좌석을 빠르게 두 번 누르면 같은 구역 좌석을 모두 선택한다", () => {
    const { result, props } = renderInteraction();

    act(() => result.current.startSeatDrag(createPointerEvent(1_000), 0));
    act(() => result.current.finishDrag());
    act(() => result.current.startSeatDrag(createPointerEvent(1_250), 0));

    expect(props.setSelectedSeatIndices).toHaveBeenLastCalledWith([0, 2]);
    expect(props.onLayoutChangeStart).toHaveBeenCalledOnce();
  });

  it("더블 클릭 제한 시간을 넘기면 구역 전체를 선택하지 않는다", () => {
    const { result, props } = renderInteraction();

    act(() => result.current.startSeatDrag(createPointerEvent(1_000), 0));
    act(() => result.current.finishDrag());
    act(() => result.current.startSeatDrag(createPointerEvent(1_500), 0));

    expect(props.setSelectedSeatIndices).not.toHaveBeenCalledWith([0, 2]);
    expect(props.onLayoutChangeStart).toHaveBeenCalledTimes(2);
  });

  it("공연장 크기에 따라 최대 확대 배율을 계산하고 제한한다", () => {
    const { result } = renderInteraction();
    const expectedMaxZoom = Math.max(venue.width, venue.height) / VENUE_LAYOUT_MIN_VISIBLE_SIZE;

    expect(result.current.maxZoom).toBe(expectedMaxZoom);
    act(() => result.current.applyZoom(100));
    expect(result.current.zoom).toBe(expectedMaxZoom);
  });

  it("Alt 키 상태와 키보드 확대, 축소, 초기화 및 선택 해제를 처리한다", () => {
    const { result, props } = renderInteraction();
    act(() => window.dispatchEvent(new KeyboardEvent("keydown", { key: "Alt" })));
    expect(result.current.isAltPressed).toBe(true);
    act(() => window.dispatchEvent(new KeyboardEvent("keyup", { key: "Alt" })));
    expect(result.current.isAltPressed).toBe(false);
    act(() => window.dispatchEvent(new Event("blur")));

    const preventDefault = vi.fn();
    act(() => result.current.handleKeyDown({ key: "+", metaKey: false, ctrlKey: false, preventDefault } as never));
    expect(result.current.zoom).toBeGreaterThan(1);
    act(() => result.current.handleKeyDown({ key: "-", metaKey: true, ctrlKey: false, preventDefault } as never));
    act(() => result.current.handleKeyDown({ key: "0", metaKey: true, ctrlKey: false, preventDefault } as never));
    expect(result.current.zoom).toBe(1);
    act(() => result.current.handleKeyDown({ key: "Escape", metaKey: false, ctrlKey: false, preventDefault } as never));
    expect(props.setSelectedSeatIndices).toHaveBeenCalledWith([]);
    act(() => result.current.handleKeyDown({ key: "x", metaKey: false, ctrlKey: false, preventDefault } as never));
  });

  it("Option 휠 확대를 처리하고 일반 휠과 제출 중 휠은 무시한다", () => {
    const listeners = new Map<string, EventListener>();
    const fakeSvg = {
      addEventListener: vi.fn((name: string, listener: EventListener) => listeners.set(name, listener)),
      removeEventListener: vi.fn(),
      focus: vi.fn(),
      setPointerCapture: vi.fn(),
      createSVGPoint: () => ({
        x: 0,
        y: 0,
        matrixTransform: function () {
          return { x: this.x, y: this.y };
        },
      }),
      getScreenCTM: () => ({ inverse: () => ({}) }),
    };
    const { result } = renderInteraction();
    result.current.svgRef.current = fakeSvg as never;
    act(() => result.current.applyZoom(2));
    const wheel = listeners.get("wheel");
    expect(wheel).toBeDefined();
    const event = new WheelEvent("wheel", { deltaY: -1, altKey: true, cancelable: true });
    act(() => wheel?.(event));
    expect(event.defaultPrevented).toBe(true);
    act(() => wheel?.(new WheelEvent("wheel", { deltaY: 1, altKey: true, cancelable: true })));
    act(() => wheel?.(new WheelEvent("wheel", { deltaY: 1 })));
  });

  it("SVG 변환 행렬이 없으면 기본 좌표를 사용한다", () => {
    const { result } = renderInteraction();
    result.current.svgRef.current = {
      focus: vi.fn(),
      setPointerCapture: vi.fn(),
      createSVGPoint: () => ({ x: 0, y: 0 }),
      getScreenCTM: () => null,
    } as never;
    act(() => result.current.startStageDrag(createFullPointerEvent() as never));
    expect(result.current.dragState).toMatchObject({ pointerX: 0, pointerY: 0 });
  });

  it("화면을 드래그해 이동하고 클릭이면 선택을 해제한다", () => {
    const { result, props } = renderInteraction();
    act(() => result.current.startBackgroundDrag(createFullPointerEvent({ clientX: 50, clientY: 50 }) as never));
    expect(document.body.style.overflow).toBe("hidden");
    act(() => result.current.handlePointerMove(createFullPointerEvent({ clientX: 20, clientY: 20 }) as never));
    act(() => result.current.handlePointerMove(createFullPointerEvent({ clientX: 19, clientY: 19 }) as never));
    expect(result.current.pan.x).toBeGreaterThanOrEqual(0);
    act(() => result.current.finishDrag());

    act(() => result.current.startBackgroundDrag(createFullPointerEvent() as never));
    act(() => result.current.finishDrag());
    expect(props.setSelectedSeatIndices).toHaveBeenCalledWith([]);
  });

  it("화면 이동 임계값 이하 움직임은 클릭 상태를 유지한다", () => {
    const { result } = renderInteraction();
    act(() => result.current.startBackgroundDrag(createFullPointerEvent({ clientX: 20, clientY: 20 }) as never));
    act(() => result.current.handlePointerMove(createFullPointerEvent({ clientX: 21, clientY: 21 }) as never));
    expect(result.current.dragState).toMatchObject({ type: "pan", moved: false });
  });

  it("Alt 드래그 영역 안 좌석을 선택하고 Shift 선택에 기존 좌석을 합친다", () => {
    const props = {
      venue,
      venueSeats,
      selectedSeatIndices: [1],
      isSubmitting: false,
      setVenue: vi.fn(),
      setVenueSeats: vi.fn(),
      setErrors: vi.fn(),
      setSelectedSeatIndices: vi.fn(),
      onLayoutChangeStart: vi.fn(),
    };
    const { result } = renderHook(() => useVenueLayoutInteraction(props));
    attachCoordinateSvg(result as ReturnType<typeof renderInteraction>["result"]);
    act(() => result.current.startBackgroundDrag(createFullPointerEvent({ clientX: 0, clientY: 0, altKey: true }) as never));
    act(() => result.current.handlePointerMove(createFullPointerEvent({ clientX: 70, clientY: 40 }) as never));
    expect(props.setSelectedSeatIndices).toHaveBeenCalledWith([0, 1, 2]);

    act(() => result.current.finishDrag());
    act(() => result.current.startBackgroundDrag(createFullPointerEvent({ altKey: true, shiftKey: true }) as never));
    act(() => result.current.handlePointerMove(createFullPointerEvent({ clientX: 25, clientY: 35 }) as never));
    expect(props.setSelectedSeatIndices).toHaveBeenCalledWith(expect.arrayContaining([0, 1]));
  });

  it("무대와 좌석을 공연장 범위 안에서 이동한다", () => {
    let currentVenue = venue;
    let currentSeats = venueSeats;
    let currentErrors = {};
    const props = {
      venue,
      venueSeats,
      selectedSeatIndices: [0, 2],
      isSubmitting: false,
      setVenue: vi.fn((update) => {
        currentVenue = typeof update === "function" ? update(currentVenue) : update;
      }),
      setVenueSeats: vi.fn((update) => {
        currentSeats = typeof update === "function" ? update(currentSeats) : update;
      }),
      setErrors: vi.fn((update) => {
        currentErrors = typeof update === "function" ? update(currentErrors) : update;
      }),
      setSelectedSeatIndices: vi.fn(),
      onLayoutChangeStart: vi.fn(),
    };
    const { result } = renderHook(() => useVenueLayoutInteraction(props));
    attachCoordinateSvg(result as ReturnType<typeof renderInteraction>["result"]);

    act(() => result.current.startStageDrag(createFullPointerEvent({ clientX: 50, clientY: 10 }) as never));
    act(() => result.current.handlePointerMove(createFullPointerEvent({ clientX: 80, clientY: 50 }) as never));
    expect(currentVenue.stagePositionX).toBe(80);

    act(() => result.current.finishDrag());
    act(() => result.current.startSeatDrag(createFullPointerEvent({ clientX: 20, clientY: 30 }) as never, 0));
    act(() => result.current.handlePointerMove(createFullPointerEvent({ clientX: 30, clientY: 40 }) as never));
    expect(currentSeats[0]).toMatchObject({ positionX: 30, positionY: 40 });
    expect(currentSeats[2]).toMatchObject({ positionX: 70, positionY: 40 });
    expect(currentErrors).toHaveProperty("seat.0.positionX", "");
  });

  it("선택 영역 드래그와 Alt 선택 전환 및 제출 중 입력 무시를 처리한다", () => {
    const { result, props } = renderInteraction();
    act(() => result.current.startSelectedAreaDrag(createFullPointerEvent() as never));
    expect(props.onLayoutChangeStart).not.toHaveBeenCalled();

    const selectedProps = { ...props, selectedSeatIndices: [0] };
    const selected = renderHook(() => useVenueLayoutInteraction(selectedProps));
    act(() => selected.result.current.startSelectedAreaDrag(createFullPointerEvent() as never));
    expect(selectedProps.onLayoutChangeStart).toHaveBeenCalled();
    act(() => selected.result.current.finishDrag());
    act(() => selected.result.current.startSelectedAreaDrag(createFullPointerEvent({ altKey: true }) as never));

    const disabled = renderHook(() => useVenueLayoutInteraction({ ...props, isSubmitting: true }));
    act(() => disabled.result.current.startBackgroundDrag(createFullPointerEvent() as never));
    act(() => disabled.result.current.startStageDrag(createFullPointerEvent() as never));
    act(() => disabled.result.current.startSeatDrag(createFullPointerEvent() as never, 0));
    act(() => disabled.result.current.startSelectedAreaDrag(createFullPointerEvent() as never));
    act(() => disabled.result.current.handlePointerMove(createFullPointerEvent() as never));
    expect(disabled.result.current.dragState).toBeNull();
  });

  it("Shift 좌석 선택을 추가하고 해제하며 없는 좌석 더블 클릭을 무시한다", () => {
    const props = {
      venue,
      venueSeats,
      selectedSeatIndices: [] as number[],
      isSubmitting: false,
      setVenue: vi.fn(),
      setVenueSeats: vi.fn(),
      setErrors: vi.fn(),
      setSelectedSeatIndices: vi.fn((update) => {
        if (typeof update === "function") update([0]);
      }),
      onLayoutChangeStart: vi.fn(),
    };
    const { result } = renderHook(() => useVenueLayoutInteraction(props));
    act(() => result.current.startSeatDrag(createFullPointerEvent({ shiftKey: true, timeStamp: 1_000 }) as never, 1));
    expect(props.setSelectedSeatIndices).toHaveBeenCalled();
    act(() => result.current.finishDrag());
    act(() => result.current.startSeatDrag(createFullPointerEvent({ shiftKey: true, timeStamp: 1_500 }) as never, 0));

    const missingSection = renderHook(() =>
      useVenueLayoutInteraction({ ...props, venueSeats: [{ ...venueSeats[0], sectionName: undefined }] as unknown as CreateVenueSeatRequest[] }),
    );
    act(() => missingSection.result.current.startSeatDrag(createFullPointerEvent({ timeStamp: 2_000 }) as never, 0));
    act(() => missingSection.result.current.startSeatDrag(createFullPointerEvent({ timeStamp: 2_100 }) as never, 0));
  });
});
