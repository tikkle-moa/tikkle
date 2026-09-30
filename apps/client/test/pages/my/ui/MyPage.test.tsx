import { MemoryRouter } from "react-router";

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { ROUTE_PATHS } from "@shared/config/router.config";

import { useSessionStore } from "@entities/session";
import type { User } from "@entities/session/model/session.types";

import MyPage from "@pages/my/ui/MyPage";

const mockHandleLogout = vi.hoisted(() => vi.fn());

vi.mock("@features/auth", () => ({
  useLogout: () => ({ handleLogout: mockHandleLogout }),
}));

const TEST_USER = {
  id: 1,
  email: "test@example.com",
  nickname: "테스트 사용자",
  profileImageUrl: "https://example.com/profile.png",
  role: "USER",
  oauthAccounts: ["google"],
} satisfies User;

const renderMyPage = () => {
  render(
    <MemoryRouter>
      <MyPage />
    </MemoryRouter>,
  );
};

describe("MyPage", () => {
  beforeEach(() => {
    mockHandleLogout.mockClear();
    useSessionStore.setState({ user: TEST_USER, status: "authenticated" });
  });

  it("비로그인 상태에서는 로그인 유도 카드와 로그인 링크를 표시한다", () => {
    useSessionStore.setState({ user: null, status: "unauthenticated" });

    renderMyPage();

    expect(screen.getByText("로그인하여 원하는 공연을 찾아보세요")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "로그인하고 공연 찾아보기" })).toHaveAttribute("href", ROUTE_PATHS.LOGIN);
    expect(screen.queryByRole("button", { name: "로그아웃" })).not.toBeInTheDocument();
  });

  it("세션 상태를 확인하는 동안에는 화면을 표시하지 않는다", () => {
    useSessionStore.setState({ user: null, status: "loading" });

    renderMyPage();

    expect(screen.queryByRole("heading", { name: "마이" })).not.toBeInTheDocument();
  });

  it("사용자 프로필 정보를 표시한다", () => {
    renderMyPage();

    expect(screen.getByText("테스트 사용자님, 반가워요")).toBeInTheDocument();
    expect(screen.getByAltText("테스트 사용자 프로필 이미지")).toBeInTheDocument();
  });

  it("세션 사용자가 없으면 마이 화면을 렌더링하지 않는다", () => {
    useSessionStore.setState({ user: null, status: "loading" });

    renderMyPage();

    expect(screen.queryByRole("heading", { name: "마이" })).not.toBeInTheDocument();
  });

  it("관심과 내 예약 메뉴 링크를 표시한다", () => {
    renderMyPage();

    expect(screen.getByRole("link", { name: /내 예약/ })).toHaveAttribute("href", ROUTE_PATHS.MY_RESERVATIONS);
    expect(screen.getByRole("link", { name: /관심/ })).toHaveAttribute("href", ROUTE_PATHS.MY_FAVORITES);
  });

  it("로그아웃 버튼을 누르면 로그아웃을 요청한다", async () => {
    const user = userEvent.setup();

    renderMyPage();

    await user.click(screen.getByRole("button", { name: "로그아웃" }));

    expect(mockHandleLogout).toHaveBeenCalledTimes(1);
  });
});
