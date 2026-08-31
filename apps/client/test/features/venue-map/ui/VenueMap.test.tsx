import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import type { VenueResponse, VenueSeatResponse } from "@entities/venue";

import { VenueMap } from "@features/venue-map";

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

describe("VenueMap", () => {
  it("공연장 가상 캔버스와 정적 좌석을 렌더링한다", () => {
    const { container } = render(<VenueMap venue={venue} seats={seats} />);

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

    render(<VenueMap venue={venue} seats={seats} />);

    const seat = screen.getByRole("button", { name: "A구역 1열 1번, 150,000원" });
    await user.click(seat);

    expect(seat).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText("A구역 1열 1번 · A구역 · 150,000원")).toBeInTheDocument();
  });

  it("Enter 키로도 좌석 정보를 확인할 수 있다", async () => {
    const user = userEvent.setup();

    render(<VenueMap venue={venue} seats={seats} />);

    const seat = screen.getByRole("button", { name: "A구역 1열 2번, 150,000원" });
    seat.focus();

    await user.keyboard("{Enter}");

    expect(seat).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText("A구역 1열 2번 · A구역 · 150,000원")).toBeInTheDocument();
  });
});
