import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import type { VenueResponse, VenueSeatResponse } from "@entities/venue";

import { VenueMap } from "@features/venue-map";

const pointerCaptureDescriptor = Object.getOwnPropertyDescriptor(SVGElement.prototype, "setPointerCapture");

const venue: VenueResponse = {
  id: 1,
  name: "올림픽공원 KSPO DOME",
  address: "서울특별시 송파구 올림픽로 424",
  description: "가상 공연장 좌석 배치도입니다.",
  width: 100,
  height: 100,
  stagePositionX: 50,
  stagePositionY: 10,
  stageWidth: 72,
  stageHeight: 13,
  createdAt: "2026-08-25T12:00:00",
};

const seats: VenueSeatResponse[] = [
  {
    id: 1,
    venueId: 1,
    sectionName: "A구역",
    seatNumber: 1,
    seatLabel: "A구역 1열 1번",
    price: 150000,
    positionX: 20,
    positionY: 28,
    createdAt: "2026-08-25T12:00:00",
  },
  {
    id: 2,
    venueId: 1,
    sectionName: "A구역",
    seatNumber: 2,
    seatLabel: "A구역 1열 2번",
    price: 150000,
    positionX: 23,
    positionY: 28,
    createdAt: "2026-08-25T12:00:00",
  },
];

const setMapBounds = (element: Element) => {
  Object.defineProperty(element, "getBoundingClientRect", {
    configurable: true,
    value: () => ({
      left: 0,
      top: 0,
      width: 100,
      height: 100,
    }),
  });
};

const createTouchMoveEvent = (touchCount: number) => {
  const event = new Event("touchmove", {
    bubbles: true,
    cancelable: true,
  });

  Object.defineProperty(event, "touches", {
    value: Array.from({ length: touchCount }),
  });

  return event;
};

beforeAll(() => {
  Object.defineProperty(SVGElement.prototype, "setPointerCapture", {
    configurable: true,
    value: vi.fn(),
  });
});

afterAll(() => {
  if (pointerCaptureDescriptor) {
    Object.defineProperty(SVGElement.prototype, "setPointerCapture", pointerCaptureDescriptor);
    return;
  }

  delete (SVGElement.prototype as Partial<SVGElement>).setPointerCapture;
});

describe("VenueMap", () => {
  it("공연장 가상 캔버스와 정적 좌석을 렌더링한다", () => {
    const { container } = render(<VenueMap venue={venue} venueSeats={seats} />);

    expect(screen.getByRole("heading", { name: "좌석 배치 정보" })).toBeInTheDocument();
    expect(screen.getByText("올림픽공원 KSPO DOME · 전체 2석")).toBeInTheDocument();

    const map = screen.getByLabelText("올림픽공원 KSPO DOME 좌석 배치도");
    expect(map).toHaveAttribute("viewBox", "0 0 100 100");

    const stage = container.querySelector("svg > rect");
    expect(stage).toHaveAttribute("x", "14");
    expect(stage).toHaveAttribute("y", "3.5");
    expect(screen.getByText("STAGE")).toBeInTheDocument();

    expect(screen.getByRole("button", { name: "A구역 1열 1번, 150,000원" })).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByRole("button", { name: "A구역 1열 2번, 150,000원" })).toHaveAttribute("aria-pressed", "false");
  });

  it("좌석을 클릭하면 해당 좌석 정보를 표시한다", async () => {
    const user = userEvent.setup();

    render(<VenueMap venue={venue} venueSeats={seats} />);

    const seat = screen.getByRole("button", { name: "A구역 1열 1번, 150,000원" });
    await user.click(seat);

    expect(seat).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText("A구역 1열 1번 · A구역 · 150,000원")).toBeInTheDocument();
  });

  it("확대 제어 버튼으로 확대와 축소할 수 있다", async () => {
    const user = userEvent.setup();

    render(<VenueMap venue={venue} venueSeats={seats} />);

    const zoomOut = screen.getByRole("button", { name: "축소" });
    const zoomIn = screen.getByRole("button", { name: "확대" });
    const zoom = screen.getByLabelText("현재 확대 비율");

    expect(zoomOut).toBeDisabled();
    expect(zoom).toHaveTextContent("100%");

    await user.click(zoomIn);

    expect(zoom).toHaveTextContent("120%");
    expect(zoomOut).toBeEnabled();

    await user.click(zoomOut);

    expect(zoom).toHaveTextContent("100%");
    expect(zoomOut).toBeDisabled();
  });

  it("Option 휠일 때만 지도 확대와 기본 스크롤 방지를 적용한다", () => {
    render(<VenueMap venue={venue} venueSeats={seats} />);

    const map = screen.getByLabelText("올림픽공원 KSPO DOME 좌석 배치도");
    const mapContainer = map.parentElement;

    if (!mapContainer) {
      throw new Error("지도 컨테이너를 찾을 수 없습니다.");
    }

    setMapBounds(mapContainer);

    const normalWheel = new WheelEvent("wheel", {
      bubbles: true,
      cancelable: true,
      clientX: 50,
      clientY: 50,
      deltaY: -100,
    });

    act(() => {
      mapContainer.dispatchEvent(normalWheel);
    });

    expect(normalWheel.defaultPrevented).toBe(false);
    expect(screen.getByLabelText("현재 확대 비율")).toHaveTextContent("100%");

    const optionWheel = new WheelEvent("wheel", {
      altKey: true,
      bubbles: true,
      cancelable: true,
      clientX: 50,
      clientY: 50,
      deltaY: -100,
    });

    act(() => {
      mapContainer.dispatchEvent(optionWheel);
    });

    expect(optionWheel.defaultPrevented).toBe(true);
    expect(screen.getByLabelText("현재 확대 비율")).toHaveTextContent("120%");

    const optionWheelDown = new WheelEvent("wheel", {
      altKey: true,
      bubbles: true,
      cancelable: true,
      clientX: 50,
      clientY: 50,
      deltaY: 100,
    });

    act(() => {
      mapContainer.dispatchEvent(optionWheelDown);
    });

    expect(optionWheelDown.defaultPrevented).toBe(true);
    expect(screen.getByLabelText("현재 확대 비율")).toHaveTextContent("100%");
  });

  it("Enter 키로도 좌석 정보를 확인할 수 있다", async () => {
    const user = userEvent.setup();

    render(<VenueMap venue={venue} venueSeats={seats} />);

    const seat = screen.getByRole("button", { name: "A구역 1열 2번, 150,000원" });
    seat.focus();

    await user.keyboard("{Enter}");

    expect(seat).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText("A구역 1열 2번 · A구역 · 150,000원")).toBeInTheDocument();
  });

  it("지도 내부의 두 손가락 제스처와 Safari 제스처만 브라우저 확대를 막는다", () => {
    render(<VenueMap venue={venue} venueSeats={seats} />);

    const map = screen.getByLabelText("올림픽공원 KSPO DOME 좌석 배치도");
    const mapContainer = map.parentElement;

    if (!mapContainer) {
      throw new Error("지도 컨테이너를 찾을 수 없습니다.");
    }

    const oneFingerMove = createTouchMoveEvent(1);

    act(() => {
      mapContainer.dispatchEvent(oneFingerMove);
    });

    expect(oneFingerMove.defaultPrevented).toBe(false);

    const pinchMove = createTouchMoveEvent(2);

    act(() => {
      mapContainer.dispatchEvent(pinchMove);
    });

    expect(pinchMove.defaultPrevented).toBe(true);

    for (const eventType of ["gesturestart", "gesturechange"]) {
      const safariGesture = new Event(eventType, {
        bubbles: true,
        cancelable: true,
      });

      act(() => {
        mapContainer.dispatchEvent(safariGesture);
      });

      expect(safariGesture.defaultPrevented).toBe(true);
    }
  });

  it("드래그 중에는 grabbing 커서를 표시하고 드래그 직후 좌석 클릭을 무시한다", async () => {
    const user = userEvent.setup();

    render(<VenueMap venue={venue} venueSeats={seats} />);

    const map = screen.getByLabelText("올림픽공원 KSPO DOME 좌석 배치도");
    const seat = screen.getByRole("button", { name: "A구역 1열 1번, 150,000원" });

    setMapBounds(map);

    await user.click(screen.getByRole("button", { name: "확대" }));

    fireEvent.pointerDown(map, {
      button: 0,
      clientX: 50,
      clientY: 50,
      pointerId: 1,
      pointerType: "mouse",
    });
    fireEvent.pointerMove(map, {
      clientX: 30,
      clientY: 50,
      pointerId: 1,
      pointerType: "mouse",
    });

    expect(map).toHaveClass("cursor-grabbing");

    fireEvent.pointerUp(map, {
      clientX: 30,
      clientY: 50,
      pointerId: 1,
      pointerType: "mouse",
    });

    expect(map).toHaveClass("cursor-grab");

    await user.click(seat);

    expect(seat).toHaveAttribute("aria-pressed", "false");
  });
});
