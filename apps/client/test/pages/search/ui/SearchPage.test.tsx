import { render, screen } from "@testing-library/react";

import SearchPage from "@pages/search/ui/SearchPage";

describe("SearchPage", () => {
  it("공연 검색 입력창을 표시한다", () => {
    render(<SearchPage />);

    expect(screen.getByRole("searchbox", { name: "공연 검색" })).toBeInTheDocument();
  });

  it("추천 검색어와 인기 공연 영역을 표시한다", () => {
    render(<SearchPage />);

    expect(screen.getByRole("heading", { name: "추천 검색어" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "뮤지컬" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "인기 공연" })).toBeInTheDocument();
  });
});
