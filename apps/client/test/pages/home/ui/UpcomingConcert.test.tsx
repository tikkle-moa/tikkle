import { render, screen } from "@testing-library/react";

import { UPCOMING_CONCERTS } from "@pages/home/model/dummy-data.constants";
import UpcomingConcert from "@pages/home/ui/UpcomingConcert";

describe("UpcomingConcert", () => {
  beforeEach(() => {
    render(<UpcomingConcert />);
  });

  it("섹션 제목을 렌더링한다", () => {
    expect(screen.getByText("오픈 예정")).toBeInTheDocument();
  });

  it("더미 데이터의 모든 콘서트 제목을 렌더링한다", () => {
    for (const { title } of UPCOMING_CONCERTS) {
      expect(screen.getByText(title)).toBeInTheDocument();
    }
  });

  it("badge가 있는 항목에 배지 텍스트를 렌더링한다", () => {
    const withBadge = UPCOMING_CONCERTS.filter(({ badge }) => badge !== null);
    for (const { badge } of withBadge) {
      expect(screen.getAllByText(badge!).length).toBeGreaterThan(0);
    }
  });

  it("오픈 날짜를 '오픈 {날짜}' 형식으로 렌더링한다", () => {
    for (const { openDate } of UPCOMING_CONCERTS) {
      expect(screen.getByText(`오픈 ${openDate}`)).toBeInTheDocument();
    }
  });
});
