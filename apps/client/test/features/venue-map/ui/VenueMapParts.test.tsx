import { fireEvent, render, screen } from "@testing-library/react";

import type { VenueSeatResponse } from "@entities/venue";

import VenueMapSeatTooltip from "@features/venue-map/ui/VenueMapSeatTooltip";
import VenueMapSelectedSeatStatus from "@features/venue-map/ui/VenueMapSelectedSeatStatus";
import VenueMapSelectionInfo from "@features/venue-map/ui/VenueMapSelectionInfo";
import VenueSeatItem from "@features/venue-map/ui/VenueSeatItem";

const seat: VenueSeatResponse = {
  id: 1,
  venueId: 1,
  sectionName: "A구역",
  seatNumber: 1,
  seatLabel: "A구역 1열 1번",
  price: 150000,
  positionX: 20,
  positionY: 28,
  createdAt: "2026-08-25T12:00:00",
};

describe("venue map parts", () => {
  it("선택 좌석이 없으면 안내를 표시한다", () => {
    render(<VenueMapSelectionInfo selectedSeat={null} selectedSeatStatus={null} serverTimeOffset={0} />);

    expect(screen.getByText(/좌석을 탭하거나 클릭하여 선택하세요/)).toBeInTheDocument();
  });

  it("선택 좌석과 사용 가능 상태를 표시한다", () => {
    render(<VenueMapSelectionInfo selectedSeat={seat} selectedSeatStatus="available" serverTimeOffset={0} />);

    expect(screen.getByText("A구역 1열 1번")).toBeInTheDocument();
    expect(screen.getByText("선택 가능한 좌석입니다.")).toBeInTheDocument();
  });

  it("보류 좌석 툴팁과 상태를 표시한다", () => {
    render(
      <>
        <VenueMapSelectedSeatStatus status="held_by_my_group" expiresAt={new Date(Date.now() + 60000)} serverTimeOffset={0} />
        <VenueMapSeatTooltip seat={seat} status="held_by_my_group" placement="top-left" serverTimeOffset={0} />
      </>,
    );

    expect(screen.getByText(/남음.*Hold 중입니다/)).toBeInTheDocument();
    expect(screen.getByRole("tooltip")).toHaveTextContent("A구역 1열 1번");
  });

  it("좌석 아이템 클릭과 키보드 이벤트를 전달한다", () => {
    const onSeatClick = vi.fn();
    const onSeatKeyDown = vi.fn();
    const onPointerEnter = vi.fn();

    render(
      <svg>
        <VenueSeatItem
          seat={seat}
          status="available"
          isSelected
          isSeatSelectable
          hasSeatStatuses
          isHoldMode
          isHeld
          sectionColor="#fff"
          ariaLabel="A구역 1열 1번, 150,000원, 선택 가능한 좌석입니다."
          tabIndex={0}
          onSeatClick={onSeatClick}
          onSeatKeyDown={onSeatKeyDown}
          onPointerEnter={onPointerEnter}
        />
      </svg>,
    );

    const item = screen.getByRole("button");
    const hitbox = item.querySelector("[data-seat-hitbox]");
    const visual = item.querySelector("[data-seat-visual]");
    expect(hitbox).toHaveAttribute("width", "5.5");
    expect(hitbox).toHaveAttribute("height", "4.5");
    expect(visual).toHaveClass("group-hover:stroke-violet-700", "group-hover:stroke-[1.1]");

    fireEvent.pointerEnter(hitbox!);
    fireEvent.click(item);
    fireEvent.keyDown(item, { key: "Enter" });

    expect(onPointerEnter).toHaveBeenCalledWith(expect.anything(), seat);
    expect(onSeatClick).toHaveBeenCalledWith(seat, true);
    expect(onSeatKeyDown).toHaveBeenCalled();
    expect(item).toHaveAttribute("aria-pressed", "true");
  });
});
