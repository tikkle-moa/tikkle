import { MemoryRouter } from "react-router";

import { render, screen } from "@testing-library/react";

import { formatDateTime } from "@shared/lib/date.utils";

import type { PerformanceResponse } from "@entities/performance";

import PerformanceBookingPanel from "@pages/concert-detail/ui/PerformanceBookingPanel";

const makePerformance = (overrides: Partial<PerformanceResponse> = {}): PerformanceResponse => ({
  id: 1,
  concertId: 1,
  name: "Tikkle Live",
  startsAt: "2026-09-01T19:00:00",
  bookingOpensAt: null,
  createdAt: "2026-08-23T12:00:00",
  status: "AVAILABLE",
  ...overrides,
});

describe("PerformanceBookingPanel", () => {
  it("회차가 없으면 빈 상태와 안내 문구를 표시한다", () => {
    render(<PerformanceBookingPanel performances={[]} />);

    expect(screen.getByRole("heading", { name: "공연 회차" })).toBeInTheDocument();
    expect(screen.getByText("총 0회")).toBeInTheDocument();
    expect(screen.getByText("등록된 공연 회차가 없습니다")).toBeInTheDocument();
    expect(screen.getByText("콘서트 정보는 계속 둘러볼 수 있습니다.")).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("회차가 있으면 회차 목록과 좌석 선택 안내를 표시한다", () => {
    const firstPerformance = makePerformance({
      id: 1,
      name: "오픈 예정 공연",
      startsAt: "2026-09-01T19:00:00",
      bookingOpensAt: "2026-08-30T14:00:00",
      status: "UPCOMING",
    });
    const secondPerformance = makePerformance({ id: 2, name: "예매 중인 공연", startsAt: "2026-09-02T19:00:00" });
    const endedPerformance = makePerformance({ id: 3, name: "종료된 공연", startsAt: "2026-08-01T19:00:00", status: "ENDED" });

    render(
      <MemoryRouter>
        <PerformanceBookingPanel performances={[firstPerformance, secondPerformance, endedPerformance]} />
      </MemoryRouter>,
    );

    expect(screen.getByRole("heading", { name: "공연 회차" })).toBeInTheDocument();
    const performanceLinks = screen.getAllByRole("link");
    expect(performanceLinks[0]).toHaveAttribute("href", "/performances/1");
    expect(performanceLinks[1]).toHaveAttribute("href", "/performances/2");
    expect(performanceLinks).toHaveLength(2);
    expect(screen.getByText("오픈 예정 공연")).toBeInTheDocument();
    expect(screen.getByText("예매 중인 공연")).toBeInTheDocument();
    expect(screen.getByText("오픈 예정")).toBeInTheDocument();
    expect(screen.getByText("예매 중")).toBeInTheDocument();
    expect(screen.getByText(`${formatDateTime(firstPerformance.bookingOpensAt!)} 오픈`)).toBeInTheDocument();
    expect(screen.queryByText("예매 오픈 일정 없음")).not.toBeInTheDocument();
    expect(screen.getByText("종료된 공연").closest("div[aria-disabled='true']")).toHaveClass("cursor-not-allowed", "opacity-80");
    expect(screen.getByText("공연 종료")).toBeInTheDocument();
    expect(screen.getByText("총 3회")).toBeInTheDocument();
    expect(screen.getByRole("list", { name: "공연 회차 목록" })).toHaveClass("max-h-70", "overflow-y-auto");
    expect(screen.getByText("회차를 선택하면 상세 정보와 좌석 배치를 확인할 수 있습니다.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "좌석 선택하기" })).not.toBeInTheDocument();
  });
});
