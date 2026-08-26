import { fireEvent, render, screen } from "@testing-library/react";

import { PerformanceForm } from "@features/performance-form";

const performance = {
  id: 1,
  concertId: 7,
  startsAt: "2099-09-01T19:00:00",
  bookingOpensAt: null,
  createdAt: "2099-08-01T12:00:00",
};

describe("PerformanceForm", () => {
  it("저장된 회차와 관리 액션을 표시한다", () => {
    render(<PerformanceForm concertId={7} onChanged={vi.fn().mockResolvedValue(undefined)} performances={[performance]} />);

    expect(screen.getByText("총 1개의 공연 일정")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "공연 회차 수정" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "공연 회차 삭제" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "공연 회차 추가" })).toBeInTheDocument();
  });

  it("저장된 회차의 수정과 삭제 액션을 제공한다", () => {
    vi.stubGlobal(
      "confirm",
      vi.fn(() => false),
    );

    render(<PerformanceForm concertId={7} onChanged={vi.fn().mockResolvedValue(undefined)} performances={[performance]} />);

    expect(screen.getByText("예매 시작 · 미설정")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "공연 회차 삭제" }));

    fireEvent.click(screen.getByRole("button", { name: "공연 회차 수정" }));

    expect(screen.getByLabelText(/공연 시작 시각/)).toHaveValue("2099-09-01T19:00");
    expect(screen.getByRole("button", { name: "저장" })).toBeInTheDocument();
  });

  it("예매 시작 시각이 있으면 해당 시각을 표시한다", () => {
    const performanceWithBooking = {
      ...performance,
      bookingOpensAt: "2099-08-30T19:00:00",
    };

    render(<PerformanceForm concertId={7} onChanged={vi.fn().mockResolvedValue(undefined)} performances={[performanceWithBooking]} />);

    expect(screen.getByText(`예매 시작 · ${new Date(performanceWithBooking.bookingOpensAt).toLocaleString()}`)).toBeInTheDocument();
  });

  it("회차 추가 버튼을 누르면 인라인 입력 행을 표시한다", () => {
    render(<PerformanceForm concertId={7} onChanged={vi.fn().mockResolvedValue(undefined)} performances={[]} />);

    fireEvent.click(screen.getByRole("button", { name: "공연 회차 추가" }));

    expect(screen.getByLabelText(/공연 시작 시각/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "등록" })).toBeInTheDocument();
  });

  it("완료 버튼은 전달된 콜백을 호출한다", () => {
    const onComplete = vi.fn();

    render(<PerformanceForm concertId={7} onChanged={vi.fn().mockResolvedValue(undefined)} onComplete={onComplete} performances={[]} />);

    fireEvent.click(screen.getByRole("button", { name: "완료" }));

    expect(onComplete).toHaveBeenCalledOnce();
  });
});
