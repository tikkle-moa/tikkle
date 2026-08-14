import { renderHook } from "@testing-library/react";

import { useSessionStore } from "@entities/session";
import type { User } from "@entities/session";

import { useMyPage } from "@pages/my/model/use-my-page";

const mockHandleLogout = vi.hoisted(() => vi.fn());

vi.mock("@features/auth", () => ({
  useLogout: () => ({ handleLogout: mockHandleLogout }),
}));

const TEST_USER = {
  id: 1,
  email: "test@example.com",
  nickname: "테스트 사용자",
  profileImageUrl: null,
  role: "USER",
  oauthAccounts: ["google"],
} satisfies User;

describe("useMyPage", () => {
  beforeEach(() => {
    mockHandleLogout.mockClear();
    useSessionStore.setState({ user: null, status: "loading" });
  });

  it("세션 사용자를 제공한다", () => {
    useSessionStore.setState({ user: TEST_USER, status: "authenticated" });

    const { result } = renderHook(() => useMyPage());

    expect(result.current.user).toBe(TEST_USER);
  });

  it("로그아웃 핸들러를 제공한다", () => {
    const { result } = renderHook(() => useMyPage());

    result.current.handleLogout();

    expect(mockHandleLogout).toHaveBeenCalledTimes(1);
  });
});
