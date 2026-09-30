import { render, screen } from "@testing-library/react";

import type { PerformanceResponse } from "@entities/performance";
import type { VenueDetailResponse, VenueSeatResponse } from "@entities/venue";

import PerformanceSeatMap from "@pages/performance-detail/ui/PerformanceSeatMap";

const performance = {
  id: 1,
  concertId: 1,
  name: "Tikkle Live",
  startsAt: "2026-09-01T19:00:00",
  bookingOpensAt: "2026-08-28T14:00:00",
  createdAt: "2026-08-25T12:00:00",
  status: "UPCOMING",
} as PerformanceResponse;

const seats = [
  {
    id: 1,
    venueId: 1,
    sectionName: "A구역",
    seatNumber: 1,
    seatLabel: "A구역 1번",
    price: 15000,
    positionX: 5,
    positionY: 3,
    createdAt: "2026-08-25T12:00:00",
  },
  {
    id: 2,
    venueId: 1,
    sectionName: "A구역",
    seatNumber: 2,
    seatLabel: "A구역 2번",
    price: 15000,
    positionX: 10,
    positionY: 8,
    createdAt: "2026-08-25T12:00:00",
  },
] as VenueSeatResponse[];

const venueDetail = {
  venue: {
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
  },
  venueSeats: seats,
} as VenueDetailResponse;

describe("PerformanceSeatMap", () => {
  it("좌석 배치도 구현을 위한 기본 화면을 표시한다", () => {
    render(<PerformanceSeatMap performance={performance} venueDetail={venueDetail} />);

    expect(screen.getByRole("heading", { name: "좌석 배치 정보" })).toBeInTheDocument();
    expect(screen.getByText("올림픽공원 KSPO DOME")).toBeInTheDocument();
    expect(screen.getByText("전체 2석")).toBeInTheDocument();
    expect(screen.getByText("STAGE")).toBeInTheDocument();
    expect(screen.queryByLabelText("좌석 상태 안내")).not.toBeInTheDocument();
  });

  it("예매 가능 회차에서는 좌석 Hold 패널을 표시한다", () => {
    render(<PerformanceSeatMap performance={{ ...performance, status: "AVAILABLE" }} venueDetail={venueDetail} />);

    expect(screen.getByRole("complementary", { name: "좌석 선택 및 Hold" })).toBeInTheDocument();
  });

  it("예매할 수 없는 회차에서는 좌석 Hold callback을 연결하지 않는다", () => {
    render(<PerformanceSeatMap performance={{ ...performance, status: "ENDED" }} venueDetail={venueDetail} />);

    expect(screen.queryByRole("complementary", { name: "좌석 선택 및 Hold" })).not.toBeInTheDocument();
  });
});
