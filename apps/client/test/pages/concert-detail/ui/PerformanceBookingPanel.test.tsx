import { render, screen } from "@testing-library/react";

import { type PerformanceResponse, formatPerformanceDateTime } from "@entities/performance";

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

    render(<PerformanceBookingPanel performances={[firstPerformance, secondPerformance]} />);

    expect(screen.getByRole("heading", { name: "공연 회차" })).toBeInTheDocument();
    expect(screen.getByText(formatPerformanceDateTime(firstPerformance.startsAt))).toBeInTheDocument();
    expect(screen.getByText(formatPerformanceDateTime(secondPerformance.startsAt))).toBeInTheDocument();
    expect(screen.getByText("좌석 선택은 회차별 좌석 화면에서 진행합니다.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "좌석 선택하기" })).not.toBeInTheDocument();
  });
});
