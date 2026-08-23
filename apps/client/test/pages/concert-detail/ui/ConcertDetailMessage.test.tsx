import { render, screen } from "@testing-library/react";

import ConcertDetailMessage from "@pages/concert-detail/ui/ConcertDetailMessage";

describe("ConcertDetailMessage", () => {
  it("전달된 제목과 설명을 표시한다", () => {
    render(<ConcertDetailMessage title="존재하지 않는 공연입니다." description="다른 공연을 둘러보세요." />);

    expect(screen.getByRole("heading", { name: "존재하지 않는 공연입니다." })).toBeInTheDocument();
    expect(screen.getByText("다른 공연을 둘러보세요.")).toBeInTheDocument();
  });
});
