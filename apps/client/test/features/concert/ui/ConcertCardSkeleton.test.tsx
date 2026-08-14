import { render } from "@testing-library/react";

import ConcertCardSkeleton from "@features/concert/ui/ConcertCardSkeleton";

describe("ConcertCardSkeleton", () => {
  it("이미지 영역 animate-pulse를 렌더링한다", () => {
    const { container } = render(<ConcertCardSkeleton />);

    expect(container.querySelectorAll(".animate-pulse").length).toBeGreaterThan(0);
  });

  it("showTitle이면 제목 스켈레톤 바를 렌더링한다", () => {
    const { container } = render(<ConcertCardSkeleton displayOptions={{ showTitle: true }} />);

    // 이미지(1) + 제목(1)
    expect(container.querySelectorAll(".animate-pulse")).toHaveLength(2);
  });

  it("showTitle, showPlaceName, showPeriod이면 텍스트 바 3개를 렌더링한다", () => {
    const { container } = render(<ConcertCardSkeleton displayOptions={{ showTitle: true, showPlaceName: true, showPeriod: true }} />);

    // 이미지(1) + 제목(1) + 장소(1) + 기간(1)
    expect(container.querySelectorAll(".animate-pulse")).toHaveLength(4);
  });

  it("showStatus이면 상태 배지 스켈레톤을 렌더링한다", () => {
    const { container } = render(<ConcertCardSkeleton displayOptions={{ showStatus: true }} />);

    // 이미지(1) + 상태 배지(1)
    expect(container.querySelectorAll(".animate-pulse")).toHaveLength(2);
  });

  it("show prop이 없으면 이미지 스켈레톤만 렌더링한다", () => {
    const { container } = render(<ConcertCardSkeleton />);

    expect(container.querySelectorAll(".animate-pulse")).toHaveLength(1);
  });
});
