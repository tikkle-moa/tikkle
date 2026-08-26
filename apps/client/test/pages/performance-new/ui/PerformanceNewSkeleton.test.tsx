import { render, screen } from "@testing-library/react";

import PerformanceNewSkeleton from "@pages/performance-new/ui/PerformanceNewSkeleton";

describe("PerformanceNewSkeleton", () => {
  it("로딩 상태와 접근성 안내를 제공한다", () => {
    render(<PerformanceNewSkeleton />);

    expect(screen.getByRole("status")).toHaveAttribute("aria-busy", "true");
    expect(screen.getByText("콘서트 정보를 불러오는 중입니다.")).toBeInTheDocument();
  });
});
