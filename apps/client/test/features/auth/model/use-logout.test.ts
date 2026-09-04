import { renderHook } from "@testing-library/react";

import { useSessionStore } from "@entities/session";
import type { User } from "@entities/session/model/session.types";

import { useLogout } from "@features/auth/model/use-logout";

const { mockDisconnect, mockPost } = vi.hoisted(() => ({
  mockDisconnect: vi.fn(),
  mockPost: vi.fn(),
}));

vi.mock("@shared/realtime/stomp.store", () => ({
  useStompStore: (selector: (state: { disconnect: () => Promise<void> }) => unknown) => selector({ disconnect: mockDisconnect }),
}));
vi.mock("@shared/api", () => ({
  apiClient: { POST: mockPost },
}));

const TEST_USER: User = {
  id: 1,
  email: "test@example.com",
  nickname: "테스트 사용자",
  profileImageUrl: null,
  role: "USER",
  oauthAccounts: ["google"],
};

describe("useLogout", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockPost.mockResolvedValue({ data: { success: true } });
    mockDisconnect.mockResolvedValue(undefined);
    vi.spyOn(console, "error").mockImplementation(() => {});
    useSessionStore.setState({
      user: TEST_USER,
      status: "authenticated",
      justLoggedOut: false,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("POST /api/auth/logout을 호출한다", async () => {
    const { result } = renderHook(() => useLogout());

    await result.current.handleLogout();

    expect(mockPost).toHaveBeenCalledWith("/api/auth/logout");
  });

  it("로그아웃 성공 시 STOMP 연결을 해제하고 세션을 초기화한다", async () => {
    const { result } = renderHook(() => useLogout());

    await result.current.handleLogout();

    expect(mockDisconnect).toHaveBeenCalledOnce();
    expect(useSessionStore.getState().status).toBe("loading");
    expect(useSessionStore.getState().user).toBeNull();
    expect(useSessionStore.getState().justLoggedOut).toBe(true);
  });

  it("API 실패 시에도 세션을 초기화하고 홈으로 리다이렉트될 상태를 설정한다", async () => {
    mockPost.mockResolvedValue({ error: { message: "Server error" } });

    const { result } = renderHook(() => useLogout());

    await result.current.handleLogout();

    expect(useSessionStore.getState().status).toBe("loading");
    expect(useSessionStore.getState().user).toBeNull();
    expect(useSessionStore.getState().justLoggedOut).toBe(true);
  });

  it("네트워크 오류 시에도 세션을 초기화하고 홈으로 리다이렉트될 상태를 설정한다", async () => {
    mockPost.mockRejectedValue(new Error("Network error"));

    const { result } = renderHook(() => useLogout());

    await result.current.handleLogout();

    expect(useSessionStore.getState().status).toBe("loading");
    expect(useSessionStore.getState().user).toBeNull();
    expect(useSessionStore.getState().justLoggedOut).toBe(true);
  });
});
