import type { PointerEvent as ReactPointerEvent } from "react";

import { act, renderHook } from "@testing-library/react";

import type { CreateVenueRequest } from "@entities/venue";

import { useVenueLayoutInteraction } from "@features/venue-form/model/use-venue-layout-interaction";
import type { VenueFormSeat } from "@features/venue-form/model/venue-form.types";
import { VENUE_LAYOUT_MIN_ZOOM } from "@features/venue-form/model/venue-layout.constants";

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

const venueSeats: VenueFormSeat[] = [
  { clientId: 0, sectionName: "A", seatNumber: 1, seatLabel: "A1", price: 10_000, positionX: 20, positionY: 30 },
  { clientId: 1, sectionName: "B", seatNumber: 1, seatLabel: "B1", price: 20_000, positionX: 40, positionY: 30 },
  { clientId: 2, sectionName: "A", seatNumber: 2, seatLabel: "A2", price: 10_000, positionX: 60, positionY: 30 },
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

const renderInteraction = (currentVenue = venue) => {
  const setSelectedSeatClientIds = vi.fn();
  const props = {
    venue: currentVenue,
    venueSeats,
    selectedSeatClientIdSet: new Set<number>(),
    collisionMapRef: { current: new Map<number, Set<number>>() },
    isSubmitting: false,
    setVenue: vi.fn(),
    setVenueSeats: vi.fn(),
    setErrors: vi.fn(),
    setSelectedSeatClientIds,
    onLayoutChangeStart: vi.fn(),
  };
  return { ...renderHook(() => useVenueLayoutInteraction(props)), props };
};

const startSeatDrag = (result: ReturnType<typeof renderInteraction>["result"], event: ReactPointerEvent<SVGElement>, clientId: number) => {
  Object.defineProperty(event, "target", {
    value: { closest: () => ({ dataset: { seatClientId: String(clientId) } }) },
  });
  result.current.handlePointerDown(event as ReactPointerEvent<SVGGElement>);
};

const attachCoordinateSvg = (result: ReturnType<typeof renderInteraction>["result"]) => {
  result.current.svgRef.current = {
    focus: vi.fn(),
    setPointerCapture: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
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

    act(() => startSeatDrag(result, createPointerEvent(1_000), 0));
    act(() => result.current.finishDrag());
    act(() => startSeatDrag(result, createPointerEvent(1_250), 0));

    expect(props.setSelectedSeatClientIds).toHaveBeenLastCalledWith([0, 2]);
    expect(props.onLayoutChangeStart).toHaveBeenCalledOnce();
  });

  it("더블 클릭 제한 시간을 넘기면 구역 전체를 선택하지 않는다", () => {
    const { result, props } = renderInteraction();

    act(() => startSeatDrag(result, createPointerEvent(1_000), 0));
    act(() => result.current.finishDrag());
    act(() => startSeatDrag(result, createPointerEvent(1_500), 0));

    expect(props.setSelectedSeatClientIds).not.toHaveBeenCalledWith([0, 2]);
    expect(props.onLayoutChangeStart).toHaveBeenCalledTimes(2);
  });

  it("100 x 100 공연장은 최소 표시 크기까지 확대한다", () => {
    const { result } = renderInteraction();

    expect(result.current.maxZoom).toBe(1.25);
    act(() => result.current.applyZoom(100));
    expect(result.current.zoom).toBe(1.25);
  });

  it("1000 x 1000 공연장도 고정 화면 비율의 최소 표시 크기까지 확대한다", () => {
    const largeVenue = { ...venue, width: 1_000, height: 1_000 };
    const { result } = renderInteraction(largeVenue);

    expect(result.current.maxZoom).toBe(12.5);
  });

  it("10보다 작은 공연장도 최소 확대 배율 1을 유지한다", () => {
    const smallVenue = { ...venue, width: 5, height: 5, stagePositionX: 2.5, stagePositionY: 2.5 };
    const { result } = renderInteraction(smallVenue);

    expect(result.current.maxZoom).toBe(VENUE_LAYOUT_MIN_ZOOM);
    act(() => result.current.applyZoom(10));
    expect(result.current.zoom).toBe(VENUE_LAYOUT_MIN_ZOOM);
    expect(result.current.pan).toEqual({ x: 0, y: 0 });
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
    expect(props.setSelectedSeatClientIds).toHaveBeenCalledWith([]);
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
    expect(props.setSelectedSeatClientIds).toHaveBeenCalledWith([]);
  });

  it("화면 이동 임계값 이하 움직임은 클릭 상태를 유지한다", () => {
    const { result } = renderInteraction();
    act(() => result.current.startBackgroundDrag(createFullPointerEvent({ clientX: 20, clientY: 20 }) as never));
    act(() => result.current.handlePointerMove(createFullPointerEvent({ clientX: 21, clientY: 21 }) as never));
    expect(result.current.dragState).toMatchObject({ type: "pan", moved: false });
  });

  it("화면 이동이 경계에 닿은 뒤 반대 방향 드래그에 즉시 반응한다", () => {
    const { result } = renderInteraction();
    act(() => result.current.applyZoom(2));
    act(() => result.current.startBackgroundDrag(createFullPointerEvent({ clientX: 50, clientY: 50 }) as never));

    act(() => result.current.handlePointerMove(createFullPointerEvent({ clientX: 150, clientY: 50 }) as never));
    act(() => result.current.finishDrag());
    expect(result.current.pan.x).toBe(0);

    act(() => result.current.startBackgroundDrag(createFullPointerEvent({ clientX: 150, clientY: 50 }) as never));
    act(() => result.current.handlePointerMove(createFullPointerEvent({ clientX: 149, clientY: 50 }) as never));
    act(() => result.current.finishDrag());
    expect(result.current.pan.x).toBeGreaterThan(0);
  });

  it("SVG와 공연장 비율이 달라도 실제 렌더링 배율로 화면을 이동한다", () => {
    const { result } = renderInteraction();
    const currentTarget = { getBoundingClientRect: () => ({ width: 160, height: 100 }) };
    act(() => result.current.applyZoom(2));
    act(() => result.current.startBackgroundDrag(createFullPointerEvent({ clientX: 50, clientY: 50 }) as never));

    act(() => result.current.handlePointerMove(createFullPointerEvent({ clientX: 30, clientY: 50, currentTarget }) as never));
    act(() => result.current.finishDrag());

    expect(result.current.pan.x).toBe(20);
  });

  it("화면 이동 종료 직후 늦게 도착한 포인터 이동을 무시한다", () => {
    const { result } = renderInteraction();
    act(() => result.current.startBackgroundDrag(createFullPointerEvent() as never));

    act(() => {
      const handlePointerMove = result.current.handlePointerMove;
      result.current.finishDrag();
      handlePointerMove(createFullPointerEvent({ clientX: 30 }) as never);
    });

    expect(result.current.dragState).toBeNull();
  });

  it("Alt 드래그 영역 안 좌석을 선택하고 Shift 선택에 기존 좌석을 합친다", () => {
    const props = {
      venue,
      venueSeats,
      selectedSeatClientIdSet: new Set([1]),
      collisionMapRef: { current: new Map<number, Set<number>>() },
      isSubmitting: false,
      setVenue: vi.fn(),
      setVenueSeats: vi.fn(),
      setErrors: vi.fn(),
      setSelectedSeatClientIds: vi.fn(),
      onLayoutChangeStart: vi.fn(),
    };
    const { result } = renderHook(() => useVenueLayoutInteraction(props));
    attachCoordinateSvg(result as ReturnType<typeof renderInteraction>["result"]);
    act(() => result.current.startBackgroundDrag(createFullPointerEvent({ clientX: 0, clientY: 0, altKey: true }) as never));
    act(() => result.current.handlePointerMove(createFullPointerEvent({ clientX: 70, clientY: 40 }) as never));
    act(() => result.current.finishDrag());
    expect(props.setSelectedSeatClientIds).toHaveBeenCalledWith([0, 1, 2]);

    act(() => result.current.startBackgroundDrag(createFullPointerEvent({ altKey: true, shiftKey: true }) as never));
    act(() => result.current.handlePointerMove(createFullPointerEvent({ clientX: 25, clientY: 35 }) as never));
    act(() => result.current.finishDrag());
    expect(props.setSelectedSeatClientIds).toHaveBeenCalledWith(expect.arrayContaining([0, 1]));
  });

  it("무대와 좌석을 공연장 범위 안에서 이동한다", () => {
    let currentVenue = venue;
    let currentSeats = venueSeats;
    const props = {
      venue,
      venueSeats,
      selectedSeatClientIdSet: new Set([0, 2]),
      collisionMapRef: { current: new Map<number, Set<number>>() },
      isSubmitting: false,
      setVenue: vi.fn((update) => {
        currentVenue = typeof update === "function" ? update(currentVenue) : update;
      }),
      setVenueSeats: vi.fn((update) => {
        currentSeats = typeof update === "function" ? update(currentSeats) : update;
      }),
      setErrors: vi.fn(),
      setSelectedSeatClientIds: vi.fn(),
      onLayoutChangeStart: vi.fn(),
    };
    const { result } = renderHook(() => useVenueLayoutInteraction(props));
    attachCoordinateSvg(result as ReturnType<typeof renderInteraction>["result"]);

    act(() => result.current.startStageDrag(createFullPointerEvent({ clientX: 50, clientY: 10 }) as never));
    act(() => result.current.handlePointerMove(createFullPointerEvent({ clientX: 80, clientY: 50 }) as never));
    expect(currentVenue.stagePositionX).toBe(80);

    act(() => result.current.finishDrag());
    act(() =>
      startSeatDrag(result as ReturnType<typeof renderInteraction>["result"], createFullPointerEvent({ clientX: 20, clientY: 30 }) as never, 0),
    );
    act(() => result.current.handlePointerMove(createFullPointerEvent({ clientX: 30, clientY: 40 }) as never));
    expect(currentSeats[0]).toMatchObject({ positionX: 30, positionY: 40 });
    expect(currentSeats[2]).toMatchObject({ positionX: 70, positionY: 40 });
  });

  it("확대 상태에서는 무대를 현재 viewport 안으로 제한한다", () => {
    let currentVenue = venue;
    const props = {
      venue,
      venueSeats,
      selectedSeatClientIdSet: new Set<number>(),
      collisionMapRef: { current: new Map<number, Set<number>>() },
      isSubmitting: false,
      setVenue: vi.fn((update) => {
        currentVenue = typeof update === "function" ? update(currentVenue) : update;
      }),
      setVenueSeats: vi.fn(),
      setErrors: vi.fn(),
      setSelectedSeatClientIds: vi.fn(),
      onLayoutChangeStart: vi.fn(),
    };
    const { result } = renderHook(() => useVenueLayoutInteraction(props));
    attachCoordinateSvg(result as ReturnType<typeof renderInteraction>["result"]);

    act(() => result.current.applyZoom(1.25));
    act(() => result.current.startStageDrag(createFullPointerEvent({ clientX: 50, clientY: 10 }) as never));
    act(() => result.current.handlePointerMove(createFullPointerEvent({ clientX: 200, clientY: 200 }) as never));

    expect(currentVenue.stagePositionX).toBe(result.current.pan.x + result.current.viewWidth - venue.stageWidth / 2);
    expect(currentVenue.stagePositionY).toBe(result.current.pan.y + result.current.viewHeight - venue.stageHeight / 2);
  });

  it("무대가 viewport보다 크면 공연장 전체 경계로 제한한다", () => {
    const largeStageVenue = {
      ...venue,
      stagePositionX: 50,
      stagePositionY: 50,
      stageWidth: 90,
      stageHeight: 70,
    };
    let currentVenue = largeStageVenue;
    const props = {
      venue: largeStageVenue,
      venueSeats,
      selectedSeatClientIdSet: new Set<number>(),
      collisionMapRef: { current: new Map<number, Set<number>>() },
      isSubmitting: false,
      setVenue: vi.fn((update) => {
        currentVenue = typeof update === "function" ? update(currentVenue) : update;
      }),
      setVenueSeats: vi.fn(),
      setErrors: vi.fn(),
      setSelectedSeatClientIds: vi.fn(),
      onLayoutChangeStart: vi.fn(),
    };
    const { result } = renderHook(() => useVenueLayoutInteraction(props));
    attachCoordinateSvg(result as ReturnType<typeof renderInteraction>["result"]);

    act(() => result.current.applyZoom(1.25));
    act(() => result.current.startStageDrag(createFullPointerEvent({ clientX: 50, clientY: 50 }) as never));
    act(() => result.current.handlePointerMove(createFullPointerEvent({ clientX: 200, clientY: 200 }) as never));

    expect(currentVenue.stagePositionX).toBe(55);
    expect(currentVenue.stagePositionY).toBe(65);
  });

  it("선택 영역 드래그와 Alt 선택 전환 및 제출 중 입력 무시를 처리한다", () => {
    const { result, props } = renderInteraction();
    act(() => result.current.startSelectedAreaDrag(createFullPointerEvent() as never));
    expect(props.onLayoutChangeStart).not.toHaveBeenCalled();

    const selectedProps = { ...props, selectedSeatClientIdSet: new Set([0]) };
    const selected = renderHook(() => useVenueLayoutInteraction(selectedProps));
    act(() => selected.result.current.startSelectedAreaDrag(createFullPointerEvent() as never));
    expect(selectedProps.onLayoutChangeStart).toHaveBeenCalled();
    act(() => selected.result.current.finishDrag());
    act(() => selected.result.current.startSelectedAreaDrag(createFullPointerEvent({ altKey: true }) as never));

    const disabled = renderHook(() => useVenueLayoutInteraction({ ...props, isSubmitting: true }));
    act(() => disabled.result.current.startBackgroundDrag(createFullPointerEvent() as never));
    act(() => disabled.result.current.startStageDrag(createFullPointerEvent() as never));
    act(() => startSeatDrag(disabled.result as ReturnType<typeof renderInteraction>["result"], createFullPointerEvent() as never, 0));
    act(() => disabled.result.current.startSelectedAreaDrag(createFullPointerEvent() as never));
    act(() => disabled.result.current.handlePointerMove(createFullPointerEvent() as never));
    expect(disabled.result.current.dragState).toBeNull();
  });

  it("Shift 좌석 선택을 추가하고 해제하며 없는 좌석 더블 클릭을 무시한다", () => {
    const props = {
      venue,
      venueSeats,
      selectedSeatClientIdSet: new Set<number>(),
      collisionMapRef: { current: new Map<number, Set<number>>() },
      isSubmitting: false,
      setVenue: vi.fn(),
      setVenueSeats: vi.fn(),
      setErrors: vi.fn(),
      setSelectedSeatClientIds: vi.fn((update) => {
        if (typeof update === "function") update([0]);
      }),
      onLayoutChangeStart: vi.fn(),
    };
    const { result } = renderHook(() => useVenueLayoutInteraction(props));
    act(() =>
      startSeatDrag(
        result as ReturnType<typeof renderInteraction>["result"],
        createFullPointerEvent({ shiftKey: true, timeStamp: 1_000 }) as never,
        1,
      ),
    );
    expect(props.setSelectedSeatClientIds).toHaveBeenCalled();
    act(() => result.current.finishDrag());
    act(() =>
      startSeatDrag(
        result as ReturnType<typeof renderInteraction>["result"],
        createFullPointerEvent({ shiftKey: true, timeStamp: 1_500 }) as never,
        0,
      ),
    );

    const missingSection = renderHook(() =>
      useVenueLayoutInteraction({ ...props, venueSeats: [{ ...venueSeats[0], sectionName: undefined }] as unknown as VenueFormSeat[] }),
    );
    act(() =>
      startSeatDrag(
        missingSection.result as ReturnType<typeof renderInteraction>["result"],
        createFullPointerEvent({ timeStamp: 2_000 }) as never,
        0,
      ),
    );
    act(() =>
      startSeatDrag(
        missingSection.result as ReturnType<typeof renderInteraction>["result"],
        createFullPointerEvent({ timeStamp: 2_100 }) as never,
        0,
      ),
    );
  });

  it("예약 프레임에서 휠 확대, 화면 이동과 선택 영역 갱신을 처리한다", () => {
    const frames: FrameRequestCallback[] = [];
    vi.stubGlobal(
      "requestAnimationFrame",
      vi.fn((callback: FrameRequestCallback) => (frames.push(callback), frames.length)),
    );
    const listeners = new Map<string, EventListener>();
    const { result } = renderInteraction();
    result.current.svgRef.current = {
      addEventListener: (name: string, listener: EventListener) => listeners.set(name, listener),
      removeEventListener: vi.fn(),
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
    act(() => result.current.applyZoom(2));

    act(() => listeners.get("wheel")?.(new WheelEvent("wheel", { deltaY: -1, altKey: true, cancelable: true })));
    act(() => frames.shift()?.(0));
    expect(result.current.zoom).toBeGreaterThan(1);

    act(() => result.current.startBackgroundDrag(createFullPointerEvent({ clientX: 50, clientY: 50 }) as never));
    act(() => result.current.handlePointerMove(createFullPointerEvent({ clientX: 40, clientY: 40 }) as never));
    act(() => frames.shift()?.(0));
    expect(result.current.pan.x).toBeGreaterThanOrEqual(0);
    act(() => result.current.finishDrag());

    act(() => result.current.startBackgroundDrag(createFullPointerEvent({ clientX: 0, clientY: 0, altKey: true }) as never));
    act(() => result.current.handlePointerMove(createFullPointerEvent({ clientX: 70, clientY: 40 }) as never));
    act(() => result.current.handlePointerMove(createFullPointerEvent({ clientX: 60, clientY: 35 }) as never));
    act(() => frames.shift()?.(0));
    expect(result.current.dragState).toMatchObject({ type: "select", currentX: 60, currentY: 35 });
    act(() => result.current.finishDrag());
    vi.unstubAllGlobals();
  });

  it("배경에서 좌석을 찾으면 좌석 드래그로 위임하고 잘못된 이벤트 대상은 무시한다", () => {
    const { result, props } = renderInteraction();
    attachCoordinateSvg(result);
    act(() => result.current.startBackgroundDrag(createFullPointerEvent({ clientX: 20, clientY: 30 }) as never));
    expect(props.onLayoutChangeStart).toHaveBeenCalledOnce();

    const noSeatTarget = createFullPointerEvent();
    Object.defineProperty(noSeatTarget, "target", { value: { closest: () => null } });
    act(() => result.current.handlePointerDown(noSeatTarget as never));
    const invalidTarget = createFullPointerEvent();
    Object.defineProperty(invalidTarget, "target", { value: { closest: () => ({ dataset: { seatClientId: "invalid" } }) } });
    act(() => result.current.handlePointerDown(invalidTarget as never));
  });

  it("선택 좌석 묶음이 viewport보다 크면 공연장 경계로 이동을 제한하고 충돌 오류를 갱신한다", () => {
    const largeSeats = [
      { ...venueSeats[0], clientId: 10, positionX: 2.25, positionY: 1.75 },
      { ...venueSeats[1], clientId: 20, positionX: 97.75, positionY: 98.25 },
    ];
    let errorUpdater: ((current: Record<string, string>) => Record<string, string>) | undefined;
    const props = {
      venue,
      venueSeats: largeSeats,
      selectedSeatClientIdSet: new Set([10, 20]),
      collisionMapRef: { current: new Map<number, Set<number>>() },
      isSubmitting: false,
      setVenue: vi.fn(),
      setVenueSeats: vi.fn(),
      setErrors: vi.fn((update) => {
        errorUpdater = update as typeof errorUpdater;
      }),
      setSelectedSeatClientIds: vi.fn(),
      onLayoutChangeStart: vi.fn(),
    };
    const { result } = renderHook(() => useVenueLayoutInteraction(props));
    attachCoordinateSvg(result as ReturnType<typeof renderInteraction>["result"]);
    act(() => result.current.applyZoom(2));
    act(() =>
      startSeatDrag(result as ReturnType<typeof renderInteraction>["result"], createFullPointerEvent({ clientX: 2.25, clientY: 1.75 }) as never, 10),
    );
    act(() => result.current.handlePointerMove(createFullPointerEvent({ clientX: -100, clientY: -100 }) as never));
    expect(props.setVenueSeats).toHaveBeenCalled();
    expect(errorUpdater?.({})).toEqual({});
  });

  it("변화 없는 화면 이동과 종료된 선택 프레임을 안전하게 무시하고 정리한다", () => {
    const frames: FrameRequestCallback[] = [];
    const cancelAnimationFrame = vi.fn();
    vi.stubGlobal(
      "requestAnimationFrame",
      vi.fn((callback: FrameRequestCallback) => (frames.push(callback), frames.length)),
    );
    vi.stubGlobal("cancelAnimationFrame", cancelAnimationFrame);
    const { result, unmount } = renderInteraction();
    attachCoordinateSvg(result);

    act(() => result.current.startBackgroundDrag(createFullPointerEvent({ clientX: 20, clientY: 20 }) as never));
    act(() => result.current.handlePointerMove(createFullPointerEvent({ clientX: 20, clientY: 20 }) as never));
    act(() => frames.shift()?.(0));

    act(() => result.current.startBackgroundDrag(createFullPointerEvent({ clientX: 0, clientY: 0, altKey: true }) as never));
    act(() => result.current.handlePointerMove(createFullPointerEvent({ clientX: 10, clientY: 10 }) as never));
    act(() => result.current.finishDrag(createFullPointerEvent({ clientX: 10, clientY: 10 }) as never));
    act(() => frames.shift()?.(0));

    act(() => result.current.startBackgroundDrag(createFullPointerEvent({ clientX: 0, clientY: 0, altKey: true }) as never));
    act(() => result.current.handlePointerMove(createFullPointerEvent({ clientX: 10, clientY: 10 }) as never));
    unmount();
    expect(cancelAnimationFrame).toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  it("충돌 오류 내용이 바뀌면 새 오류 객체를 반환한다", () => {
    let errorUpdater: ((current: Record<string, string>) => Record<string, string>) | undefined;
    const props = {
      venue,
      venueSeats,
      selectedSeatClientIdSet: new Set([0]),
      collisionMapRef: { current: new Map<number, Set<number>>() },
      isSubmitting: false,
      setVenue: vi.fn(),
      setVenueSeats: vi.fn(),
      setErrors: vi.fn((update) => {
        errorUpdater = update as typeof errorUpdater;
      }),
      setSelectedSeatClientIds: vi.fn(),
      onLayoutChangeStart: vi.fn(),
    };
    const { result } = renderHook(() => useVenueLayoutInteraction(props));
    attachCoordinateSvg(result as ReturnType<typeof renderInteraction>["result"]);
    act(() => startSeatDrag(result as ReturnType<typeof renderInteraction>["result"], createFullPointerEvent() as never, 0));
    act(() => result.current.handlePointerMove(createFullPointerEvent({ clientX: 40, clientY: 30 }) as never));
    const currentErrors = {
      "seat.0.positionX": "기존 오류",
      "seat.0.positionY": "기존 오류",
      "seat.1.positionX": "기존 오류",
      "seat.1.positionY": "기존 오류",
    };
    expect(errorUpdater?.(currentErrors)).not.toEqual(currentErrors);
  });

  it("선택 프레임 실행 전에 화면 이동으로 전환되면 선택 상태를 덮어쓰지 않는다", () => {
    const frames: FrameRequestCallback[] = [];
    vi.stubGlobal(
      "requestAnimationFrame",
      vi.fn((callback: FrameRequestCallback) => (frames.push(callback), frames.length)),
    );
    const { result } = renderInteraction();
    attachCoordinateSvg(result);
    act(() => result.current.startBackgroundDrag(createFullPointerEvent({ altKey: true }) as never));
    act(() => result.current.handlePointerMove(createFullPointerEvent({ clientX: 30, clientY: 30 }) as never));
    act(() => result.current.startBackgroundDrag(createFullPointerEvent({ clientX: 90, clientY: 90, altKey: false }) as never));
    act(() => frames.shift()?.(0));
    expect(result.current.dragState).toMatchObject({ type: "pan" });
    vi.unstubAllGlobals();
  });

  it("선택 집합에 존재하지 않는 좌석 ID가 있으면 드래그 시작 오류를 반환한다", () => {
    const props = {
      venue,
      venueSeats,
      selectedSeatClientIdSet: new Set([999]),
      collisionMapRef: { current: new Map<number, Set<number>>() },
      isSubmitting: false,
      setVenue: vi.fn(),
      setVenueSeats: vi.fn(),
      setErrors: vi.fn(),
      setSelectedSeatClientIds: vi.fn(),
      onLayoutChangeStart: vi.fn(),
    };
    const { result } = renderHook(() => useVenueLayoutInteraction(props));
    expect(() => act(() => startSeatDrag(result as ReturnType<typeof renderInteraction>["result"], createFullPointerEvent() as never, 999))).toThrow(
      "Seat with clientId 999 not found",
    );
  });

  it("선택 영역 드래그 시작 시 선택 집합에 존재하지 않는 좌석 ID가 있으면 오류를 반환한다", () => {
    const props = {
      venue,
      venueSeats,
      selectedSeatClientIdSet: new Set([999]),
      collisionMapRef: { current: new Map<number, Set<number>>() },
      isSubmitting: false,
      setVenue: vi.fn(),
      setVenueSeats: vi.fn(),
      setErrors: vi.fn(),
      setSelectedSeatClientIds: vi.fn(),
      onLayoutChangeStart: vi.fn(),
    };
    const { result } = renderHook(() => useVenueLayoutInteraction(props));
    attachCoordinateSvg(result as ReturnType<typeof renderInteraction>["result"]);
    expect(() => act(() => result.current.startSelectedAreaDrag(createFullPointerEvent() as never))).toThrow("Seat with clientId 999 not found");
  });
});
