import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { HOT_CONCERTS } from "@pages/home/model/dummy-data.constants";
import HotConcert from "@pages/home/ui/HotConcert";

describe("HotConcert", () => {
  beforeEach(() => {
    render(<HotConcert />);
  });

  it("섹션 제목을 렌더링한다", () => {
    expect(screen.getByText("지금 HOT한 공연")).toBeInTheDocument();
  });

  it("모든 공연 제목을 렌더링한다", () => {
    for (const { title } of HOT_CONCERTS) {
      expect(screen.getByText(title)).toBeInTheDocument();
    }
  });

  it("장르 배지를 렌더링한다", () => {
    for (const { genre } of HOT_CONCERTS) {
      expect(screen.getAllByText(genre).length).toBeGreaterThan(0);
    }
  });

  it("공연 기간을 렌더링한다", () => {
    for (const { period } of HOT_CONCERTS) {
      expect(screen.getByText(period)).toBeInTheDocument();
    }
  });

  it("전체보기 버튼을 클릭할 수 있다", async () => {
    await userEvent.click(screen.getByRole("button", { name: "전체보기" }));
  });
});
