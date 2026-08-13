import { MemoryRouter } from "react-router";

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { ROUTE_PATHS } from "@shared/config/router.config";

import { useSessionStore } from "@entities/session";
import type { User } from "@entities/session";

import Header from "@widgets/header/ui/Header";

const { mockHandleLogout } = vi.hoisted(() => ({
  mockHandleLogout: vi.fn(),
}));
vi.mock("@features/auth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@features/auth")>();
  return { ...actual, useLogout: () => ({ handleLogout: mockHandleLogout }) };
});

const mockNavigate = vi.fn();
vi.mock("react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router")>();
  return { ...actual, useNavigate: () => mockNavigate };
});

const TEST_USER: User = {
  id: 1,
  email: "test@example.com",
  nickname: "테스트 사용자",
  profileImageUrl: null,
  role: "USER",
  oauthAccounts: ["google"],
};

const renderHeader = () => {
  render(
    <MemoryRouter>
      <Header />
    </MemoryRouter>,
  );
};

describe("Header", () => {
  beforeEach(() => {
    useSessionStore.setState({ user: null, status: "loading" });
    mockNavigate.mockClear();
    mockHandleLogout.mockClear();
  });

  it("로고는 홈으로 이동하는 링크다", () => {
    renderHeader();

    expect(screen.getByRole("link", { name: "Tikkle 홈으로 이동" })).toHaveAttribute("href", ROUTE_PATHS.HOME);
  });

  it("콘서트 탐색 링크를 표시한다", () => {
    renderHeader();

    expect(screen.getByRole("link", { name: "콘서트" })).toHaveAttribute("href", ROUTE_PATHS.CONCERTS);
  });

  it("콘서트 목록에서는 콘서트 링크를 현재 페이지로 표시한다", () => {
    render(
      <MemoryRouter initialEntries={[ROUTE_PATHS.CONCERTS]}>
        <Header />
      </MemoryRouter>,
    );

    expect(screen.getByRole("link", { name: "콘서트" })).toHaveAttribute("aria-current", "page");
  });

  it("loading 상태에서는 로그인 확인 중을 표시한다", () => {
    useSessionStore.setState({ status: "loading" });

    renderHeader();

    expect(screen.getByText("로그인 확인 중")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "로그인" })).not.toBeInTheDocument();
  });

  it("비로그인 상태에서는 로그인 링크를 표시한다", () => {
    useSessionStore.setState({ status: "unauthenticated" });

    renderHeader();

    expect(screen.getByRole("link", { name: "로그인" })).toHaveAttribute("href", ROUTE_PATHS.LOGIN);
  });

  it("로그인 상태에서는 사용자 닉네임을 표시한다", () => {
    useSessionStore.setState({ user: TEST_USER, status: "authenticated" });

    renderHeader();

    expect(screen.getByText(TEST_USER.nickname)).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "로그인" })).not.toBeInTheDocument();
  });

  it("로그인 상태에서는 사용자 메뉴 버튼을 표시한다", () => {
    useSessionStore.setState({ user: TEST_USER, status: "authenticated" });

    renderHeader();

    expect(screen.getByRole("button", { name: TEST_USER.nickname })).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("button", { name: "로그아웃" })).not.toBeInTheDocument();
  });

  it("사용자 메뉴 버튼 클릭 시 로그아웃 메뉴를 표시한다", async () => {
    const user = userEvent.setup();
    useSessionStore.setState({ user: TEST_USER, status: "authenticated" });

    renderHeader();

    await user.click(screen.getByRole("button", { name: TEST_USER.nickname }));

    expect(screen.getByRole("button", { name: "로그아웃" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: TEST_USER.nickname })).toHaveAttribute("aria-expanded", "true");
  });

  it("사용자 메뉴의 로그아웃 버튼 클릭 시 handleLogout을 호출한다", async () => {
    const user = userEvent.setup();
    useSessionStore.setState({ user: TEST_USER, status: "authenticated" });

    renderHeader();

    await user.click(screen.getByRole("button", { name: TEST_USER.nickname }));
    await user.click(screen.getByRole("button", { name: "로그아웃" }));

    expect(mockHandleLogout).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("button", { name: "로그아웃" })).not.toBeInTheDocument();
  });
});
