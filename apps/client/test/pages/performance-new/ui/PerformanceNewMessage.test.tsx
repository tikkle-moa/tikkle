import { render, screen } from "@testing-library/react";

import PerformanceNewMessage from "@pages/performance-new/ui/PerformanceNewMessage";

describe("PerformanceNewMessage", () => {
  it("오류 역할과 전달받은 안내 문구를 표시한다", () => {
    render(<PerformanceNewMessage description="올바른 콘서트에서 공연 회차를 등록해 주세요." title="잘못된 콘서트입니다." />);

    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "잘못된 콘서트입니다." })).toBeInTheDocument();
    expect(screen.getByText("올바른 콘서트에서 공연 회차를 등록해 주세요.")).toBeInTheDocument();
  });
});
