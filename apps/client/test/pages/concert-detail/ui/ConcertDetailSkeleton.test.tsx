import { render, screen } from "@testing-library/react";

import ConcertDetailSkeleton from "@pages/concert-detail/ui/ConcertDetailSkeleton";

describe("ConcertDetailSkeleton", () => {
  it("상세 정보 로딩 상태를 접근성 레이블로 제공한다", () => {
    const { container } = render(<ConcertDetailSkeleton />);

    expect(screen.getByLabelText("콘서트 상세 정보를 불러오는 중")).toBeInTheDocument();
    expect(container.querySelector(".animate-pulse")).toBeInTheDocument();
  });
});
