import { RouterProvider, createMemoryRouter } from "react-router";

import { render, screen } from "@testing-library/react";

import { useSessionStore } from "@entities/session";

import AuthGuard from "@app/router/AuthGuard";

const makeRouter = (initialPath = "/") =>
  createMemoryRouter(
    [
      {
        element: <AuthGuard />,
        children: [{ path: "/", element: <div>protected content</div> }],
      },
      { path: "/login", element: <div>login page</div> },
    ],
    { initialEntries: [initialPath] },
  );

describe("AuthGuard", () => {
  it("loading 상태이면 아무것도 렌더링하지 않는다", () => {
    useSessionStore.setState({ user: null, status: "loading" });

    render(<RouterProvider router={makeRouter()} />);

    expect(screen.queryByText("protected content")).not.toBeInTheDocument();
    expect(screen.queryByText("login page")).not.toBeInTheDocument();
  });

  it("unauthenticated 상태이면 /login으로 리다이렉트한다", () => {
    useSessionStore.setState({ user: null, status: "unauthenticated" });

    render(<RouterProvider router={makeRouter()} />);

    expect(screen.queryByText("protected content")).not.toBeInTheDocument();
    expect(screen.getByText("login page")).toBeInTheDocument();
  });

  it("authenticated 상태이면 자식 컴포넌트를 렌더링한다", () => {
    useSessionStore.setState({ user: null, status: "authenticated" });

    render(<RouterProvider router={makeRouter()} />);

    expect(screen.getByText("protected content")).toBeInTheDocument();
    expect(screen.queryByText("login page")).not.toBeInTheDocument();
  });
});
