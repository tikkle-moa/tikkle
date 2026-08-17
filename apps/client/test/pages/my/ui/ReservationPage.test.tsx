import { render, screen } from "@testing-library/react";

import ReservationPage from "@pages/my/ui/ReservationPage";

describe("ReservationPage", () => {
  it("내 예약 페이지를 표시한다", () => {
    render(<ReservationPage />);

    expect(screen.getByRole("heading", { name: "내 예약" })).toBeInTheDocument();
    expect(screen.getByText("내 예약 목록을 준비하고 있어요.")).toBeInTheDocument();
  });
});
