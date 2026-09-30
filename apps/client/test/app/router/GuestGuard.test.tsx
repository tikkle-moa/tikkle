import { RouterProvider, createMemoryRouter } from "react-router";

import { render, screen } from "@testing-library/react";

import { useSessionStore } from "@entities/session";

import GuestGuard from "@app/router/GuestGuard";

const makeRouter = (initialPath = "/login") =>
  createMemoryRouter(
    [
      {
        element: <GuestGuard />,
        children: [{ path: "/login", element: <div>login page</div> }],
      },
      { path: "/", element: <div>home page</div> },
    ],
    { initialEntries: [initialPath] },
  );

describe("GuestGuard", () => {
  it("loading 상태이면 아무것도 렌더링하지 않는다", () => {
    useSessionStore.setState({ user: null, status: "loading" });

    render(<RouterProvider router={makeRouter()} />);

    expect(screen.queryByText("login page")).not.toBeInTheDocument();
    expect(screen.queryByText("home page")).not.toBeInTheDocument();
  });

  it("authenticated 상태이면 /로 리다이렉트한다", () => {
    useSessionStore.setState({ user: null, status: "authenticated" });

    render(<RouterProvider router={makeRouter()} />);

    expect(screen.queryByText("login page")).not.toBeInTheDocument();
    expect(screen.getByText("home page")).toBeInTheDocument();
  });

  it("unauthenticated 상태이면 자식 컴포넌트를 렌더링한다", () => {
    useSessionStore.setState({ user: null, status: "unauthenticated" });

    render(<RouterProvider router={makeRouter()} />);

    expect(screen.getByText("login page")).toBeInTheDocument();
    expect(screen.queryByText("home page")).not.toBeInTheDocument();
  });
});
