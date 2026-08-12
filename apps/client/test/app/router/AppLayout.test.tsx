import { RouterProvider, createMemoryRouter } from "react-router";

import { render, screen } from "@testing-library/react";

import AppLayout from "@app/router/AppLayout";

vi.mock("@widgets/header", () => ({
  Header: () => <header>Mock Header</header>,
}));

const makeRouter = () =>
  createMemoryRouter(
    [
      {
        element: <AppLayout />,
        children: [{ path: "/", element: <div>child content</div> }],
      },
    ],
    { initialEntries: ["/"] },
  );

describe("AppLayout", () => {
  it("Header를 렌더링한다", () => {
    render(<RouterProvider router={makeRouter()} />);

    expect(screen.getByRole("banner")).toBeInTheDocument();
  });

  it("main 요소를 렌더링한다", () => {
    render(<RouterProvider router={makeRouter()} />);

    expect(screen.getByRole("main")).toBeInTheDocument();
  });

  it("Outlet을 통해 자식 컴포넌트를 렌더링한다", () => {
    render(<RouterProvider router={makeRouter()} />);

    expect(screen.getByText("child content")).toBeInTheDocument();
  });
});
