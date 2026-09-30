import { RouterProvider, createMemoryRouter } from "react-router";

import { render, screen } from "@testing-library/react";

import { USER_ROLE, useSessionStore } from "@entities/session";
import type { User } from "@entities/session/model/session.types";

import AdminGuard from "@app/router/AdminGuard";

const makeUser = (role: User["role"]): User => ({
  id: 1,
  email: "admin@example.com",
  nickname: "관리자",
  profileImageUrl: null,
  role,
  oauthAccounts: ["google"],
});

const makeRouter = () =>
  createMemoryRouter(
    [
      {
        element: <AdminGuard />,
        children: [{ path: "/admin", element: <div>admin content</div> }],
      },
      { path: "/login", element: <div>login page</div> },
      { path: "/", element: <div>home page</div> },
    ],
    { initialEntries: ["/admin"] },
  );

describe("AdminGuard", () => {
  it("loading 상태이면 아무것도 렌더링하지 않는다", () => {
    useSessionStore.setState({ user: null, status: "loading" });

    render(<RouterProvider router={makeRouter()} />);

    expect(screen.queryByText("admin content")).not.toBeInTheDocument();
    expect(screen.queryByText("login page")).not.toBeInTheDocument();
    expect(screen.queryByText("home page")).not.toBeInTheDocument();
  });

  it("인증되지 않았으면 로그인 페이지로 이동한다", () => {
    useSessionStore.setState({ user: null, status: "unauthenticated" });

    render(<RouterProvider router={makeRouter()} />);

    expect(screen.getByText("login page")).toBeInTheDocument();
    expect(screen.queryByText("admin content")).not.toBeInTheDocument();
  });

  it("인증 상태여도 사용자 정보가 없으면 로그인 페이지로 이동한다", () => {
    useSessionStore.setState({ user: null, status: "authenticated" });

    render(<RouterProvider router={makeRouter()} />);

    expect(screen.getByText("login page")).toBeInTheDocument();
  });

  it("일반 사용자는 홈으로 이동한다", () => {
    useSessionStore.setState({ user: makeUser(USER_ROLE.USER), status: "authenticated" });

    render(<RouterProvider router={makeRouter()} />);

    expect(screen.getByText("home page")).toBeInTheDocument();
    expect(screen.queryByText("admin content")).not.toBeInTheDocument();
  });

  it("관리자는 하위 관리 페이지를 렌더링한다", () => {
    useSessionStore.setState({ user: makeUser(USER_ROLE.ADMIN), status: "authenticated" });

    render(<RouterProvider router={makeRouter()} />);

    expect(screen.getByText("admin content")).toBeInTheDocument();
    expect(screen.queryByText("home page")).not.toBeInTheDocument();
  });
});
