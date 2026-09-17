import { render } from "@testing-library/react";

import type { VenueSeatResponse, VenueSeatState } from "@entities/venue";

import VenueSeatLayout from "@features/venue-map/ui/VenueSeatLayout";

const { mockVenueSeatItem } = vi.hoisted(() => ({
  mockVenueSeatItem: vi.fn(() => null),
}));

vi.mock("@features/venue-map/ui/VenueSeatItem", () => ({
  default: mockVenueSeatItem,
}));

const seats = [
  { id: 1, sectionName: "A", seatLabel: "A-1", price: 10000 },
  { id: 2, sectionName: "A", seatLabel: "A-2", price: 10000 },
] as VenueSeatResponse[];

const baseProps: React.ComponentProps<typeof VenueSeatLayout> = {
  venueSeats: seats,
  seatLabelById: new Map(seats.map((seat) => [seat.id, `${seat.seatLabel}, 10,000원`])),
  sectionColors: { A: "#fff" },
  venueSeatStates: new Map(),
  serverTimeOffset: 0,
  selectedSeat: null,
  onSeatToggle: vi.fn(),
  getSeatTabIndex: vi.fn(() => 0),
  handleSeatClick: vi.fn(),
  handleSeatKeyDown: vi.fn(),
  handlePointerEnter: vi.fn(),
  handleTooltipPointerMove: vi.fn(),
  handlePointerLeave: vi.fn(),
};

describe("VenueSeatLayout", () => {
  beforeEach(() => {
    mockVenueSeatItem.mockClear();
  });

  it("선택 Set의 참조만 바뀌면 좌석 목록을 다시 계산하지 않는다", () => {
    const { rerender } = render(
      <svg>
        <VenueSeatLayout {...baseProps} visibleSelectedSeatIds={new Set([1])} />
      </svg>,
    );

    expect(mockVenueSeatItem).toHaveBeenCalledTimes(2);

    rerender(
      <svg>
        <VenueSeatLayout {...baseProps} visibleSelectedSeatIds={new Set([1])} selectedSeat={seats[1]} />
      </svg>,
    );

    expect(mockVenueSeatItem).toHaveBeenCalledTimes(2);
  });

  it("제어형 선택 좌석이 바뀌면 좌석 목록을 다시 계산하지 않는다", () => {
    const { rerender } = render(
      <svg>
        <VenueSeatLayout {...baseProps} visibleSelectedSeatIds={new Set([1])} />
      </svg>,
    );

    rerender(
      <svg>
        <VenueSeatLayout {...baseProps} visibleSelectedSeatIds={new Set([2])} />
      </svg>,
    );

    expect(mockVenueSeatItem).toHaveBeenCalledTimes(2);
  });

  it("비제어형 선택 좌석이 바뀌면 좌석 목록을 갱신한다", () => {
    const { rerender } = render(
      <svg>
        <VenueSeatLayout {...baseProps} visibleSelectedSeatIds={undefined} />
      </svg>,
    );

    rerender(
      <svg>
        <VenueSeatLayout {...baseProps} visibleSelectedSeatIds={undefined} selectedSeat={seats[0]} />
      </svg>,
    );

    expect(mockVenueSeatItem).toHaveBeenCalledTimes(4);
  });

  it("제어형 좌석 상태가 바뀌면 좌석 목록을 다시 계산하지 않는다", () => {
    const manySeats = Array.from({ length: 150 }, (_, index) => ({
      id: index + 1,
      sectionName: "A",
      seatLabel: `A-${index + 1}`,
      price: 10000,
    })) as VenueSeatResponse[];
    const { rerender } = render(
      <svg>
        <VenueSeatLayout {...baseProps} venueSeats={manySeats} venueSeatStates={new Map()} />
      </svg>,
    );

    expect(mockVenueSeatItem).toHaveBeenCalledTimes(150);

    rerender(
      <svg>
        <VenueSeatLayout {...baseProps} venueSeats={manySeats} venueSeatStates={new Map<number, VenueSeatState>([[1, { status: "booked" }]])} />
      </svg>,
    );

    expect(mockVenueSeatItem).toHaveBeenCalledTimes(150);
  });

  it("청크 렌더 입력이 바뀌면 좌석을 다시 계산한다", () => {
    const { rerender } = render(
      <svg>
        <VenueSeatLayout {...baseProps} venueSeatStates={undefined} />
      </svg>,
    );

    rerender(
      <svg>
        <VenueSeatLayout {...baseProps} venueSeatStates={undefined} serverTimeOffset={1000} />
      </svg>,
    );

    expect(mockVenueSeatItem).toHaveBeenCalledTimes(4);
  });
});
