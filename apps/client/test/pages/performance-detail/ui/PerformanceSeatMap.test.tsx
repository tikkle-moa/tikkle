import { render, screen } from "@testing-library/react";

import type { PerformanceResponse } from "@entities/performance";
import type { VenueSeatResponse } from "@entities/venue";

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

describe("PerformanceSeatMap", () => {
  it("좌석 배치도 구현을 위한 기본 화면을 표시한다", () => {
    render(<PerformanceSeatMap performance={performance} seats={seats} />);

    expect(screen.getByRole("heading", { name: "좌석 배치 정보" })).toBeInTheDocument();
    expect(screen.getByText("Tikkle Live · 전체 2석")).toBeInTheDocument();
    expect(screen.getByText("STAGE")).toBeInTheDocument();
    expect(screen.getByText("좌석 상태와 선택 기능은 추후 적용 예정입니다.")).toBeInTheDocument();
  });
});
