import { render, screen } from "@testing-library/react";

import FavoritePage from "@pages/my/ui/FavoritePage";

describe("FavoritePage", () => {
  it("관심 페이지를 표시한다", () => {
    render(<FavoritePage />);

    expect(screen.getByRole("heading", { name: "관심" })).toBeInTheDocument();
    expect(screen.getByText("관심 공연 목록을 준비하고 있어요.")).toBeInTheDocument();
  });
});
