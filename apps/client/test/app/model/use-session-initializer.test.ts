import { useSessionInitializer } from "@/app/model/use-session-initializer";
import { type User, useSessionStore } from "@/entities/session";
import { act, renderHook, waitFor } from "@testing-library/react";

const { getMock } = vi.hoisted(() => ({
  getMock: vi.fn(),
}));

vi.mock("@shared/api", () => ({
  apiClient: {
    GET: getMock,
  },
}));

const TEST_USER: User = {
  id: 1,
  email: "test@example.com",
  nickname: "테스트 사용자",
  profileImageUrl: null,
  role: "USER",
  oauthAccounts: ["google"],
};

describe("useSessionInitializer", () => {
  beforeEach(() => {
    getMock.mockReset();

    useSessionStore.setState({
      user: null,
      status: "loading",
    });
  });

  it("/auth/me 성공 시 사용자 세션을 저장한다", async () => {
    getMock.mockResolvedValue({
      data: {
        success: true,
        data: TEST_USER,
      },
    });

    renderHook(() => useSessionInitializer());

    await waitFor(() => {
      expect(useSessionStore.getState()).toMatchObject({
        user: TEST_USER,
        status: "authenticated",
      });
    });

    expect(getMock).toHaveBeenCalledWith("/api/auth/me");
  });

  it("API 오류 응답이면 세션을 초기화한다", async () => {
    getMock.mockResolvedValue({
      error: {
        success: false,
        error: {
          code: 401,
          message: "인증이 필요합니다.",
        },
      },
    });

    renderHook(() => useSessionInitializer());

    await waitFor(() => {
      expect(useSessionStore.getState()).toMatchObject({
        user: null,
        status: "unauthenticated",
      });
    });
  });

  it("네트워크 오류가 발생하면 세션을 초기화한다", async () => {
    getMock.mockRejectedValue(new Error("Network error"));

    renderHook(() => useSessionInitializer());

    await waitFor(() => {
      expect(useSessionStore.getState()).toMatchObject({
        user: null,
        status: "unauthenticated",
      });
    });
  });

  it("사용자 정보가 없으면 세션을 초기화한다", async () => {
    getMock.mockResolvedValue({
      data: {
        success: true,
        data: null,
      },
    });

    renderHook(() => useSessionInitializer());

    await waitFor(() => {
      expect(useSessionStore.getState()).toMatchObject({
        user: null,
        status: "unauthenticated",
      });
    });
  });

  it("Effect가 다시 실행되어도 초기화 요청을 중복 실행하지 않는다", async () => {
    getMock.mockReturnValue(new Promise(() => undefined));

    const originalSetSession = useSessionStore.getState().setSession;
    const replacementSetSession = vi.fn<typeof originalSetSession>();

    const { unmount } = renderHook(() => useSessionInitializer());

    await waitFor(() => {
      expect(getMock).toHaveBeenCalledTimes(1);
    });

    act(() => {
      useSessionStore.setState({
        setSession: replacementSetSession,
      });
    });

    expect(getMock).toHaveBeenCalledTimes(1);

    unmount();

    useSessionStore.setState({
      setSession: originalSetSession,
    });
  });
});
