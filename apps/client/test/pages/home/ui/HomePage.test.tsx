import { Outlet, RouterProvider, createMemoryRouter } from "react-router";

import { render, screen } from "@testing-library/react";

import HomePage from "@pages/home/ui/HomePage";

import type { AppLayoutOutletContext } from "@app/model/app-layout-outlet-context.types";

vi.mock("@features/content-slider", () => ({
  ContentSlider: () => <div data-testid="content-slider" />,
}));

const renderHomePage = () => {
  const outletContext = {
    heroRef: vi.fn(),
  } satisfies AppLayoutOutletContext;

  const router = createMemoryRouter(
    [
      {
        element: <Outlet context={outletContext} />,
        children: [{ path: "/", element: <HomePage /> }],
      },
    ],
    { initialEntries: ["/"] },
  );

  render(<RouterProvider router={router} />);
};

describe("HomePage", () => {
  it("오픈 예정 섹션을 렌더링한다", () => {
    renderHomePage();
    expect(screen.getByText("오픈 예정")).toBeInTheDocument();
  });

  it("일간 랭킹 섹션을 렌더링한다", () => {
    renderHomePage();
    expect(screen.getByText("일간 랭킹")).toBeInTheDocument();
  });

  it("HOT 공연 섹션을 렌더링한다", () => {
    renderHomePage();
    expect(screen.getByText("지금 HOT한 공연")).toBeInTheDocument();
  });
});
