import { RouterProvider, createMemoryRouter } from "react-router";

import { render, screen } from "@testing-library/react";

import { ROUTE_PATHS, type RoutePaths } from "@shared/config/router.config";

import AppLayout from "@app/router/AppLayout";

vi.mock("@widgets/header", () => ({
  Header: () => <header data-testid="header">공통 헤더</header>,
  SecondaryHeader: () => <nav>보조 헤더</nav>,
}));

const makeRouter = (initialEntry: RoutePaths = ROUTE_PATHS.HOME) =>
  createMemoryRouter(
    [
      {
        element: <AppLayout />,
        children: [
          { path: ROUTE_PATHS.HOME, element: <div>페이지 콘텐츠</div> },
          { path: ROUTE_PATHS.CONCERTS, element: <div>페이지 콘텐츠</div> },
          { path: ROUTE_PATHS.SEARCH, element: <div>페이지 콘텐츠</div> },
          { path: ROUTE_PATHS.MY, element: <div>페이지 콘텐츠</div> },
        ],
      },
    ],
    { initialEntries: [initialEntry] },
  );

describe("AppLayout", () => {
  it("공통 헤더와 현재 페이지 콘텐츠를 렌더링한다", () => {
    render(<RouterProvider router={makeRouter()} />);

    expect(screen.getByText("공통 헤더")).toBeInTheDocument();

    const main = screen.getByRole("main");
    expect(main).toContainElement(screen.getByText("페이지 콘텐츠"));
  });

  it.each([ROUTE_PATHS.SEARCH, ROUTE_PATHS.MY])("%s에서는 모바일 상단 헤더를 숨긴다", (path) => {
    render(<RouterProvider router={makeRouter(path)} />);

    expect(screen.getByTestId("header").parentElement).toHaveClass("hidden", "md:block");
  });

  it.each([ROUTE_PATHS.HOME, ROUTE_PATHS.CONCERTS])("%s에서는 모바일 상단 헤더를 표시한다", (path) => {
    render(<RouterProvider router={makeRouter(path)} />);

    expect(screen.getByTestId("header").parentElement).not.toHaveClass("hidden");
  });
});
