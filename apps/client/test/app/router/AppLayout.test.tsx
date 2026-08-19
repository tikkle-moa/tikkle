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
        element: <AppLayout showSecondaryHeader />,
        children: [
          { path: ROUTE_PATHS.HOME, element: <div>페이지 콘텐츠</div> },
          { path: ROUTE_PATHS.CONCERT_LIST, element: <div>페이지 콘텐츠</div> },
        ],
      },
      {
        element: <AppLayout showSecondaryHeader={false} />,
        children: [
          { path: ROUTE_PATHS.SEARCH, element: <div>페이지 콘텐츠</div> },
          { path: ROUTE_PATHS.MY, element: <div>페이지 콘텐츠</div> },
        ],
      },
    ],
    { initialEntries: [initialEntry] },
  );

describe("AppLayout", () => {
  it.each([ROUTE_PATHS.HOME, ROUTE_PATHS.CONCERT_LIST, ROUTE_PATHS.SEARCH, ROUTE_PATHS.MY])("%s에서 공통 헤더를 렌더링한다", (path) => {
    render(<RouterProvider router={makeRouter(path)} />);

    expect(screen.getByTestId("header")).toBeInTheDocument();
  });

  it.each([ROUTE_PATHS.HOME, ROUTE_PATHS.CONCERT_LIST])("%s에서 보조 헤더를 렌더링한다", (path) => {
    render(<RouterProvider router={makeRouter(path)} />);

    expect(screen.getByText("보조 헤더")).toBeInTheDocument();
  });

  it.each([ROUTE_PATHS.SEARCH, ROUTE_PATHS.MY])("%s에서 보조 헤더를 렌더링하지 않는다", (path) => {
    render(<RouterProvider router={makeRouter(path)} />);

    expect(screen.queryByText("보조 헤더")).not.toBeInTheDocument();
  });
});
