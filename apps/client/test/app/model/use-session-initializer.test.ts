import { useSessionInitializer } from "@/app/model/use-session-initializer";
import { type User, useSessionStore } from "@/entities/session";
import { act, renderHook, waitFor } from "@testing-library/react";

const TEST_USER: User = {
  id: 1,
  email: "test@example.com",
  nickname: "테스트 사용자",
  profileImageUrl: null,
  role: "USER",
  oauthAccounts: ["google"],
};

const createResponse = (status: number, body?: unknown): Response =>
  ({
    ok: status >= 200 && status < 300,
    status,
    json: vi.fn().mockResolvedValue(body),
  }) as unknown as Response;

const fetchMock = vi.fn<typeof fetch>();

describe("useSessionInitializer", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);

    useSessionStore.setState({
      user: null,
      status: "loading",
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("/auth/me 성공 시 사용자 세션을 저장한다", async () => {
    fetchMock.mockResolvedValue(
      createResponse(200, {
        success: true,
        data: TEST_USER,
      }),
    );

    renderHook(() => useSessionInitializer());

    await waitFor(() => {
      expect(useSessionStore.getState()).toMatchObject({
        user: TEST_USER,
        status: "authenticated",
      });
    });

    expect(fetchMock).toHaveBeenCalledWith("/api/auth/me", {
      credentials: "include",
    });
  });

  it.each([401, 500])("/auth/me가 %s이면 세션을 초기화한다", async (status) => {
    fetchMock.mockResolvedValue(createResponse(status));

    renderHook(() => useSessionInitializer());

    await waitFor(() => {
      expect(useSessionStore.getState()).toMatchObject({
        user: null,
        status: "unauthenticated",
      });
    });
  });

  it("네트워크 오류가 발생하면 세션을 초기화한다", async () => {
    fetchMock.mockRejectedValue(new Error("Network error"));

    renderHook(() => useSessionInitializer());

    await waitFor(() => {
      expect(useSessionStore.getState()).toMatchObject({
        user: null,
        status: "unauthenticated",
      });
    });
  });

  it("success가 false이면 세션을 초기화한다", async () => {
    fetchMock.mockResolvedValue(
      createResponse(200, {
        success: false,
        error: {
          code: 500,
          message: "오류가 발생했습니다.",
        },
      }),
    );

    renderHook(() => useSessionInitializer());

    await waitFor(() => {
      expect(useSessionStore.getState()).toMatchObject({
        user: null,
        status: "unauthenticated",
      });
    });
  });

  it("사용자 정보가 없으면 세션을 초기화한다", async () => {
    fetchMock.mockResolvedValue(
      createResponse(200, {
        success: true,
      }),
    );

    renderHook(() => useSessionInitializer());

    await waitFor(() => {
      expect(useSessionStore.getState()).toMatchObject({
        user: null,
        status: "unauthenticated",
      });
    });
  });

  it("Effect가 다시 실행되어도 초기화 요청을 중복 실행하지 않는다", async () => {
    fetchMock.mockReturnValue(new Promise<Response>(() => undefined));

    const originalSetSession = useSessionStore.getState().setSession;

    const replacementSetSession = vi.fn<typeof originalSetSession>();

    const { unmount } = renderHook(() => useSessionInitializer());

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    act(() => {
      useSessionStore.setState({
        setSession: replacementSetSession,
      });
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);

    unmount();

    useSessionStore.setState({
      setSession: originalSetSession,
    });
  });
});
