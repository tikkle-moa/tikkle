import { RouterProvider, createMemoryRouter } from "react-router";

import { render, screen } from "@testing-library/react";

import RootLayout from "@app/router/RootLayout";

const mockUseLogoutNavigator = vi.hoisted(() => vi.fn());
vi.mock("@app/model/use-logout-navigator", () => ({
  useLogoutNavigator: mockUseLogoutNavigator,
}));

const makeRouter = () =>
  createMemoryRouter(
    [
      {
        element: <RootLayout />,
        children: [{ path: "/", element: <div>child content</div> }],
      },
    ],
    { initialEntries: ["/"] },
  );

describe("RootLayout", () => {
  beforeEach(() => {
    mockUseLogoutNavigator.mockClear();
  });

  it("자식 컴포넌트를 렌더링한다", () => {
    render(<RouterProvider router={makeRouter()} />);

    expect(screen.getByText("child content")).toBeInTheDocument();
  });

  it("useLogoutNavigator를 호출한다", () => {
    render(<RouterProvider router={makeRouter()} />);

    expect(mockUseLogoutNavigator).toHaveBeenCalled();
  });
});
