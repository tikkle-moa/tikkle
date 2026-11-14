import { RouterProvider, createMemoryRouter, useLocation } from "react-router";

import { render, screen } from "@testing-library/react";

import { useSessionStore } from "@entities/session";

import AuthGuard from "@app/router/AuthGuard";

const LoginPage = () => {
  const location = useLocation();
  return (
    <div>
      <span>login page</span>
      <span data-testid="login-search">{location.search}</span>
    </div>
  );
};

const makeRouter = (initialPath = "/") =>
  createMemoryRouter(
    [
      {
        element: <AuthGuard />,
        children: [{ path: "*", element: <div>protected content</div> }],
      },
      { path: "/login", element: <LoginPage /> },
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

  it("초대 링크에서 로그인으로 이동할 때 원래 경로와 쿼리를 보존한다", () => {
    useSessionStore.setState({ user: null, status: "unauthenticated" });

    render(<RouterProvider router={makeRouter("/groups/12?inviteCode=abc123")} />);

    expect(screen.getByTestId("login-search")).toHaveTextContent("redirect_uri=%2Fgroups%2F12%3FinviteCode%3Dabc123");
  });

  it("authenticated 상태이면 자식 컴포넌트를 렌더링한다", () => {
    useSessionStore.setState({ user: null, status: "authenticated" });

    render(<RouterProvider router={makeRouter()} />);

    expect(screen.getByText("protected content")).toBeInTheDocument();
    expect(screen.queryByText("login page")).not.toBeInTheDocument();
  });
});
