import { fireEvent, render, screen } from "@testing-library/react";

import type { VenueSeatResponse } from "@entities/venue";

import VenueSeatItem from "@features/venue-map/ui/VenueSeatItem";

const seat = {
  id: 1,
  seatLabel: "A구역 1번",
  price: 15000,
  positionX: 20,
  positionY: 20,
} as VenueSeatResponse;

const renderItem = (overrides: Partial<React.ComponentProps<typeof VenueSeatItem>> = {}) => {
  const props: React.ComponentProps<typeof VenueSeatItem> = {
    seat,
    status: "available",
    isSelected: false,
    isSeatSelectable: true,
    hasSeatStatuses: true,
    isHoldMode: true,
    isHeld: false,
    sectionColor: "#fff",
    ariaLabel: "A구역 1번, 15,000원, 선택 가능한 좌석입니다.",
    tabIndex: 0,
    onSeatClick: vi.fn(),
    onSeatKeyDown: vi.fn(),
    ...overrides,
  };
  return {
    ...render(
      <svg>
        <VenueSeatItem {...props} />
      </svg>,
    ),
    props,
  };
};

describe("VenueSeatItem", () => {
  it("예약 완료 좌석은 선택 불가 상태로 표시한다", () => {
    const { props } = renderItem({ status: "booked", isSeatSelectable: false });
    const item = screen.getByRole("button");

    expect(item).toHaveAttribute("aria-disabled", "true");
    expect(item).toHaveAttribute("data-seat-status", "booked");
    fireEvent.click(item);
    expect(props.onSeatClick).toHaveBeenCalledWith(seat, false);
  });

  it("Hold 좌석의 pointer 이벤트를 전달한다", () => {
    const onPointerEnter = vi.fn();
    const onPointerMove = vi.fn();
    const onPointerLeave = vi.fn();
    renderItem({ status: "held_by_my_group", isHeld: true, onPointerEnter, onPointerMove, onPointerLeave });
    const item = screen.getByRole("button");

    fireEvent.pointerEnter(item);
    fireEvent.pointerMove(item);
    fireEvent.pointerLeave(item);

    expect(onPointerEnter).toHaveBeenCalled();
    expect(onPointerMove).toHaveBeenCalled();
    expect(onPointerLeave).toHaveBeenCalled();
  });

  it("hold mode가 아니면 aria-disabled를 설정하지 않는다", () => {
    renderItem({ hasSeatStatuses: false, isHoldMode: false, isHeld: false, ariaLabel: "A구역 1번, 15,000원" });
    const item = screen.getByRole("button");

    expect(item).not.toHaveAttribute("aria-disabled");
    expect(item).toHaveAttribute("aria-label", "A구역 1번, 15,000원");
  });
});
