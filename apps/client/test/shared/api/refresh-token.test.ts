import type { getCookie } from "@shared/lib/cookie.utils";

const mockGetCookie = vi.hoisted(() => vi.fn<typeof getCookie>());

vi.mock("@shared/lib/cookie.utils", () => ({
  getCookie: mockGetCookie,
}));

async function loadRefreshAccessToken() {
  vi.resetModules();

  return import("@shared/api/refresh-token");
}

describe("refreshAccessToken", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetCookie.mockReturnValue(null);
    vi.spyOn(globalThis, "fetch");
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("XSRF-TOKEN 쿠키가 있으면 재발급 요청에 X-XSRF-TOKEN 헤더를 포함한다", async () => {
    mockGetCookie.mockReturnValue("test-csrf-token");
    vi.mocked(globalThis.fetch).mockResolvedValueOnce(new Response(null, { status: 200 }));

    const { refreshAccessToken } = await loadRefreshAccessToken();

    await refreshAccessToken();

    expect(globalThis.fetch).toHaveBeenCalledWith(
      "/api/auth/refresh",
      expect.objectContaining({
        method: "POST",
        credentials: "include",
        headers: {
          "X-XSRF-TOKEN": "test-csrf-token",
        },
      }),
    );
  });

  it("동시에 호출하면 하나의 refresh 요청과 Promise를 공유한다", async () => {
    let resolveRefresh!: (response: Response) => void;

    vi.mocked(globalThis.fetch).mockImplementationOnce(
      () =>
        new Promise<Response>((resolve) => {
          resolveRefresh = resolve;
        }),
    );

    const { refreshAccessToken } = await loadRefreshAccessToken();

    const firstRequest = refreshAccessToken();
    const secondRequest = refreshAccessToken();

    expect(firstRequest).toBe(secondRequest);
    expect(globalThis.fetch).toHaveBeenCalledOnce();

    resolveRefresh(new Response(null, { status: 200 }));

    await expect(firstRequest).resolves.toEqual({ type: "success" });
    await expect(secondRequest).resolves.toEqual({ type: "success" });
  });

  it("완료된 refresh 요청은 다음 호출에서 새 요청을 시작한다", async () => {
    vi.mocked(globalThis.fetch)
      .mockResolvedValueOnce(new Response(null, { status: 200 }))
      .mockResolvedValueOnce(new Response(null, { status: 200 }));

    const { refreshAccessToken } = await loadRefreshAccessToken();

    await refreshAccessToken();
    await refreshAccessToken();

    expect(globalThis.fetch).toHaveBeenCalledTimes(2);
  });

  it.each([401, 403])("재발급 응답이 %i이면 인증 실패로 반환한다", async (status) => {
    vi.mocked(globalThis.fetch).mockResolvedValueOnce(new Response(null, { status }));

    const { refreshAccessToken } = await loadRefreshAccessToken();

    await expect(refreshAccessToken()).resolves.toEqual({
      type: "authentication-failed",
    });
  });

  it("재발급 서버 오류는 재시도 가능한 실패로 반환한다", async () => {
    vi.mocked(globalThis.fetch).mockResolvedValueOnce(new Response(null, { status: 500 }));

    const { refreshAccessToken } = await loadRefreshAccessToken();

    await expect(refreshAccessToken()).resolves.toEqual({
      type: "retryable-failed",
    });
  });

  it("재발급 네트워크 오류는 재시도 가능한 실패로 반환한다", async () => {
    vi.mocked(globalThis.fetch).mockRejectedValueOnce(new Error("Network error"));

    const { refreshAccessToken } = await loadRefreshAccessToken();

    await expect(refreshAccessToken()).resolves.toEqual({
      type: "retryable-failed",
    });
  });
});
