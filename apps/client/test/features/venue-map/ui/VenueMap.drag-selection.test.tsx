import { fireEvent, render, screen } from "@testing-library/react";

import type { VenueResponse, VenueSeatResponse, VenueSeatState } from "@entities/venue";

import { VenueMap } from "@features/venue-map";

const venue = {
  id: 1,
  name: "드래그 선택 공연장",
  width: 100,
  height: 100,
  stagePositionX: 50,
  stagePositionY: 10,
  stageWidth: 50,
  stageHeight: 10,
} as VenueResponse;

const seats = [
  { id: 1, venueId: 1, sectionName: "A", seatLabel: "A-1", price: 10000, positionX: 20, positionY: 30 },
  { id: 2, venueId: 1, sectionName: "A", seatLabel: "A-2", price: 10000, positionX: 30, positionY: 30 },
  { id: 3, venueId: 1, sectionName: "A", seatLabel: "A-3", price: 10000, positionX: 40, positionY: 30 },
] as VenueSeatResponse[];

const venueSeatStates = new Map<number, VenueSeatState>([
  [1, { status: "available" }],
  [2, { status: "held_by_my_group", expiresAt: new Date() }],
  [3, { status: "booked" }],
]);

const prepareMap = () => {
  const map = screen.getByLabelText("드래그 선택 공연장 좌석 배치도");
  Object.defineProperty(map, "getBoundingClientRect", {
    configurable: true,
    value: () => ({ left: 0, top: 0, width: 100, height: 100 }),
  });
  Object.defineProperty(map, "setPointerCapture", {
    configurable: true,
    value: vi.fn(),
  });
  return map;
};

describe("VenueMap drag selection", () => {
  it("전체 선택 취소는 빈 좌석 ID 집합만 전달한다", () => {
    const onSeatSelectionChange = vi.fn();
    const onSeatToggle = vi.fn();
    render(
      <VenueMap
        venue={venue}
        venueSeats={seats}
        venueSeatStates={venueSeatStates}
        selectedSeatIds={new Set([1, 2])}
        onSeatToggle={onSeatToggle}
        onSeatSelectionChange={onSeatSelectionChange}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "전체 선택 취소" }));

    expect(onSeatSelectionChange).toHaveBeenCalledTimes(1);
    expect(onSeatSelectionChange).toHaveBeenCalledWith(new Set());
    expect(onSeatToggle).not.toHaveBeenCalled();
  });

  it("제어된 선택 상태가 비워지면 좌석 테두리 스타일을 원복한다", () => {
    const onSeatToggle = vi.fn();
    const { rerender } = render(
      <VenueMap
        venue={venue}
        venueSeats={seats}
        venueSeatStates={venueSeatStates}
        selectedSeatIds={new Set([1])}
        onSeatToggle={onSeatToggle}
        onSeatSelectionChange={vi.fn()}
      />,
    );

    const selectedSeat = screen.getByRole("button", { name: /A-1/ });
    const visual = selectedSeat.querySelector("[data-seat-visual]");
    expect(visual).toHaveAttribute("stroke", "#312e81");
    expect(visual).toHaveAttribute("stroke-width", "1.1");

    rerender(
      <VenueMap
        venue={venue}
        venueSeats={seats}
        venueSeatStates={venueSeatStates}
        selectedSeatIds={new Set()}
        onSeatToggle={onSeatToggle}
        onSeatSelectionChange={vi.fn()}
      />,
    );

    expect(visual).toHaveAttribute("stroke", "#86efac");
    expect(visual).toHaveAttribute("stroke-width", "0.3");
  });

  it("좌석을 이동 없이 누르고 떼면 단일 클릭으로 처리한다", () => {
    const onSeatToggle = vi.fn();
    render(
      <VenueMap
        venue={venue}
        venueSeats={seats}
        venueSeatStates={venueSeatStates}
        selectedSeatIds={new Set()}
        onSeatToggle={onSeatToggle}
        onSeatSelectionChange={vi.fn()}
      />,
    );
    const map = prepareMap();
    const seat = screen.getByRole("button", { name: /A-1/ });

    fireEvent.pointerDown(seat, { button: 0, clientX: 20, clientY: 30, pointerId: 1, pointerType: "mouse" });
    fireEvent.pointerUp(seat, { button: 0, clientX: 20, clientY: 30, pointerId: 1, pointerType: "mouse" });
    fireEvent.click(seat);

    expect(map.setPointerCapture).not.toHaveBeenCalled();
    expect(onSeatToggle).toHaveBeenCalledTimes(1);
    expect(onSeatToggle).toHaveBeenCalledWith(seats[0].id);
  });

  it("Option 드래그가 끝난 뒤 선택 가능한 좌석 ID를 한 번에 전달한다", () => {
    const onSeatSelectionChange = vi.fn();
    const onSeatToggle = vi.fn();
    render(
      <VenueMap
        venue={venue}
        venueSeats={seats}
        venueSeatStates={venueSeatStates}
        selectedSeatIds={new Set()}
        onSeatToggle={onSeatToggle}
        onSeatSelectionChange={onSeatSelectionChange}
      />,
    );
    const map = prepareMap();

    fireEvent.pointerDown(map, { altKey: true, button: 0, clientX: 15, clientY: 25, pointerId: 1, pointerType: "mouse" });
    fireEvent.pointerMove(map, { altKey: true, clientX: 45, clientY: 35, pointerId: 1, pointerType: "mouse" });

    expect(onSeatSelectionChange).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: /A-1/ })).toHaveAttribute("data-selected", "true");
    expect(screen.getByRole("button", { name: /A-2/ })).toHaveAttribute("data-selected", "true");
    expect(screen.getByRole("button", { name: /A-3/ })).toHaveAttribute("data-selected", "false");

    fireEvent.pointerUp(map, { altKey: true, clientX: 45, clientY: 35, pointerId: 1, pointerType: "mouse" });

    expect(onSeatSelectionChange).toHaveBeenCalledTimes(1);
    expect(onSeatSelectionChange).toHaveBeenCalledWith(new Set([1, 2]));

    fireEvent.click(screen.getByRole("button", { name: /A-1/ }));
    expect(onSeatToggle).toHaveBeenCalledWith(seats[0].id);
  });

  it("Shift와 함께 드래그하면 기존 선택에 새 좌석을 추가한다", () => {
    const onSeatSelectionChange = vi.fn();
    render(
      <VenueMap
        venue={venue}
        venueSeats={seats}
        venueSeatStates={venueSeatStates}
        selectedSeatIds={new Set([2])}
        onSeatToggle={vi.fn()}
        onSeatSelectionChange={onSeatSelectionChange}
      />,
    );
    const map = prepareMap();

    fireEvent.pointerDown(map, { altKey: true, shiftKey: true, button: 0, clientX: 15, clientY: 25, pointerId: 1, pointerType: "mouse" });
    fireEvent.pointerUp(map, { altKey: true, shiftKey: true, clientX: 25, clientY: 35, pointerId: 1, pointerType: "mouse" });

    expect(onSeatSelectionChange).toHaveBeenCalledWith(new Set([2, 1]));
  });

  it("드래그가 취소되면 미리보기 선택을 기존 상태로 복구한다", () => {
    const onSeatSelectionChange = vi.fn();
    render(
      <VenueMap
        venue={venue}
        venueSeats={seats}
        venueSeatStates={venueSeatStates}
        selectedSeatIds={new Set([2])}
        onSeatToggle={vi.fn()}
        onSeatSelectionChange={onSeatSelectionChange}
      />,
    );
    const map = prepareMap();

    fireEvent.pointerDown(map, { altKey: true, button: 0, clientX: 15, clientY: 25, pointerId: 1, pointerType: "mouse" });
    fireEvent.pointerMove(map, { altKey: true, clientX: 25, clientY: 35, pointerId: 1, pointerType: "mouse" });
    expect(screen.getByRole("button", { name: /A-1/ })).toHaveAttribute("data-selected", "true");
    expect(screen.getByRole("button", { name: /A-2/ })).toHaveAttribute("data-selected", "false");

    fireEvent.pointerCancel(map, { pointerId: 1, pointerType: "mouse" });

    expect(screen.getByRole("button", { name: /A-1/ })).toHaveAttribute("data-selected", "false");
    expect(screen.getByRole("button", { name: /A-2/ })).toHaveAttribute("data-selected", "true");
    expect(onSeatSelectionChange).not.toHaveBeenCalled();
  });

  it("좌석 상태 변경을 React 좌석 렌더 없이 SVG 속성에 동기화한다", () => {
    const onSeatToggle = vi.fn();
    const availableStates = new Map<number, VenueSeatState>(seats.map((seat) => [seat.id, { status: "available" }]));
    const { rerender } = render(
      <VenueMap
        venue={venue}
        venueSeats={seats}
        venueSeatStates={availableStates}
        selectedSeatIds={new Set()}
        onSeatToggle={onSeatToggle}
        onSeatSelectionChange={vi.fn()}
      />,
    );

    const bookedStates = new Map(availableStates);
    bookedStates.set(1, { status: "booked" });
    rerender(
      <VenueMap
        venue={venue}
        venueSeats={seats}
        venueSeatStates={bookedStates}
        selectedSeatIds={new Set()}
        onSeatToggle={onSeatToggle}
        onSeatSelectionChange={vi.fn()}
      />,
    );

    const bookedSeat = screen.getByRole("button", { name: /A-1/ });
    expect(bookedSeat).toHaveAttribute("data-seat-status", "booked");
    expect(bookedSeat).toHaveAttribute("aria-disabled", "true");
    expect(bookedSeat.querySelector("[data-seat-visual]")).toHaveAttribute("fill", "#d1d5db");

    fireEvent.click(bookedSeat);
    expect(onSeatToggle).not.toHaveBeenCalled();
  });

  it("좌석에서 시작한 Option 드래그 직후 click을 한 번 무시한다", () => {
    const onSeatToggle = vi.fn();
    render(
      <VenueMap
        venue={venue}
        venueSeats={seats}
        venueSeatStates={venueSeatStates}
        selectedSeatIds={new Set()}
        onSeatToggle={onSeatToggle}
        onSeatSelectionChange={vi.fn()}
      />,
    );
    const map = prepareMap();
    const seat = screen.getByRole("button", { name: /A-1/ });

    fireEvent.pointerDown(seat, {
      altKey: true,
      button: 0,
      clientX: 20,
      clientY: 30,
      pointerId: 1,
      pointerType: "mouse",
    });
    fireEvent.pointerMove(map, {
      altKey: true,
      clientX: 30,
      clientY: 35,
      pointerId: 1,
      pointerType: "mouse",
    });
    fireEvent.pointerUp(map, {
      altKey: true,
      clientX: 30,
      clientY: 35,
      pointerId: 1,
      pointerType: "mouse",
    });
    fireEvent.click(seat);

    expect(onSeatToggle).not.toHaveBeenCalled();
  });

  it("선택 드래그가 없는 pointer cancel은 지도 제스처 종료로 처리한다", () => {
    render(<VenueMap venue={venue} venueSeats={seats} />);
    const map = prepareMap();

    expect(() => fireEvent.pointerCancel(map, { pointerId: 1, pointerType: "mouse" })).not.toThrow();
  });
});
