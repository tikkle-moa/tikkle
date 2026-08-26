import { MemoryRouter } from "react-router";

import { render, screen } from "@testing-library/react";

import type { PerformanceResponse } from "@entities/performance";

import PerformanceBookingPanel from "@pages/concert-detail/ui/PerformanceBookingPanel";

const makePerformance = (overrides: Partial<PerformanceResponse> = {}): PerformanceResponse => ({
  id: 1,
  concertId: 1,
  startsAt: "2026-09-01T19:00:00",
  bookingOpensAt: null,
  createdAt: "2026-08-23T12:00:00",
  ...overrides,
});

describe("PerformanceBookingPanel", () => {
  it("회차가 없으면 예매 준비 상태와 비활성 CTA를 표시한다", () => {
    render(<PerformanceBookingPanel performances={[]} />);

    expect(screen.getByRole("heading", { name: "예매하기" })).toBeInTheDocument();
    expect(screen.getByText("예매 회차를 준비 중입니다")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "좌석 선택하기" })).toBeDisabled();
  });

  it("회차가 있으면 회차 목록과 좌석 선택 안내를 표시한다", () => {
    const firstPerformance = makePerformance({ id: 1, startsAt: "2026-09-01T19:00:00" });
    const secondPerformance = makePerformance({ id: 2, startsAt: "2026-09-02T19:00:00" });

    render(
      <MemoryRouter>
        <PerformanceBookingPanel performances={[firstPerformance, secondPerformance]} />
      </MemoryRouter>,
    );

    expect(screen.getByRole("heading", { name: "공연 회차" })).toBeInTheDocument();
    const performanceLinks = screen.getAllByRole("link");
    expect(performanceLinks[0]).toHaveAttribute("href", "/performances/1");
    expect(performanceLinks[1]).toHaveAttribute("href", "/performances/2");
    expect(screen.getByText("좌석 선택은 회차별 좌석 화면에서 진행합니다.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "좌석 선택하기" })).not.toBeInTheDocument();
  });
});
