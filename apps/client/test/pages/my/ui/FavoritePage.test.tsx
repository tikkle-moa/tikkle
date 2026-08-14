import { RouterProvider, createMemoryRouter } from "react-router";

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { ROUTE_PATHS } from "@shared/config/router.config";

import FavoritePage from "@pages/my/ui/FavoritePage";

const renderFavoritePage = () => {
  const router = createMemoryRouter(
    [
      { path: ROUTE_PATHS.MY, element: <p>마이 페이지</p> },
      { path: ROUTE_PATHS.MY_FAVORITES, element: <FavoritePage /> },
    ],
    {
      initialEntries: [ROUTE_PATHS.MY, ROUTE_PATHS.MY_FAVORITES],
      initialIndex: 1,
    },
  );

  render(<RouterProvider router={router} />);
};

describe("FavoritePage", () => {
  it("관심 페이지를 표시한다", () => {
    renderFavoritePage();

    expect(screen.getByRole("heading", { name: "관심" })).toBeInTheDocument();
    expect(screen.getByText("관심 공연 목록을 준비하고 있어요.")).toBeInTheDocument();
  });

  it("뒤로가기 버튼을 누르면 이전 마이 페이지로 이동한다", async () => {
    const user = userEvent.setup();

    renderFavoritePage();

    await user.click(screen.getByRole("button", { name: "이전 페이지로 돌아가기" }));

    expect(await screen.findByText("마이 페이지")).toBeInTheDocument();
  });
});
