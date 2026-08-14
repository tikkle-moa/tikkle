import { render, screen } from "@testing-library/react";

import SearchSuggestions from "@features/concert-search/ui/SearchSuggestions";

describe("SearchSuggestions", () => {
  it("추천 검색어와 인기 공연 영역을 표시한다", () => {
    render(<SearchSuggestions />);

    expect(screen.getByRole("heading", { name: "추천 검색어" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "뮤지컬" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "인기 공연" })).toBeInTheDocument();
  });
});
