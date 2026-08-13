import { MemoryRouter } from "react-router";

import { fireEvent, render, screen } from "@testing-library/react";
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

  it("데스크톱 검색 입력창을 표시한다", () => {
    renderHeader();

    expect(screen.getByRole("searchbox", { name: "공연 검색" })).toBeInTheDocument();
  });

  it("검색창에 포커스하면 검색 패널을 표시한다", async () => {
    const user = userEvent.setup();

    renderHeader();

    await user.click(screen.getByRole("searchbox", { name: "공연 검색" }));

    expect(screen.getByRole("region", { name: "공연 검색" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "추천 검색어" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "인기 공연" })).toBeInTheDocument();
  });

  it("검색 패널 외부를 클릭하면 패널을 닫는다", async () => {
    const user = userEvent.setup();

    renderHeader();

    await user.click(screen.getByRole("searchbox", { name: "공연 검색" }));
    fireEvent.pointerDown(document.body);

    expect(screen.queryByRole("region", { name: "공연 검색" })).not.toBeInTheDocument();
  });

  it("검색 패널이 열린 상태에서 Escape를 누르면 패널을 닫는다", async () => {
    const user = userEvent.setup();

    renderHeader();

    await user.click(screen.getByRole("searchbox", { name: "공연 검색" }));
    await user.keyboard("{Escape}");

    expect(screen.queryByRole("region", { name: "공연 검색" })).not.toBeInTheDocument();
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
