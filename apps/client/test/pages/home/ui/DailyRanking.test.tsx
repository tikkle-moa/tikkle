import { render, screen } from "@testing-library/react";

import { DAILY_RANKINGS } from "@pages/home/model/dummy-data.constants";
import DailyRanking from "@pages/home/ui/DailyRanking";

describe("DailyRanking", () => {
  beforeEach(() => {
    render(<DailyRanking />);
  });

  it("섹션 제목을 렌더링한다", () => {
    expect(screen.getByText("일간 랭킹")).toBeInTheDocument();
  });

  it("모든 공연 제목을 렌더링한다", () => {
    for (const { title } of DAILY_RANKINGS) {
      expect(screen.getByText(title)).toBeInTheDocument();
    }
  });

  it("순위 번호를 렌더링한다", () => {
    for (const { rank } of DAILY_RANKINGS) {
      expect(screen.getByText(String(rank))).toBeInTheDocument();
    }
  });

  it("공연장과 기간을 함께 렌더링한다", () => {
    for (const { venue, period } of DAILY_RANKINGS) {
      expect(screen.getByText(`${venue} · ${period}`)).toBeInTheDocument();
    }
  });
});
