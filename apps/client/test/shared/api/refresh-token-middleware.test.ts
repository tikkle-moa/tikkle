import { refreshTokenMiddleware } from "@shared/api/refresh-token-middleware";
import type { getCookie } from "@shared/lib/cookie.utils";

const mockClearSession = vi.hoisted(() => vi.fn());
const mockGetCookie = vi.hoisted(() => vi.fn<typeof getCookie>());

vi.mock("@entities/session", () => ({
  useSessionStore: {
    getState: () => ({ clearSession: mockClearSession }),
  },
}));

vi.mock("@shared/lib/cookie.utils", () => ({
  getCookie: mockGetCookie,
}));

function makeRequest(url: string, method = "GET"): Request {
  return new Request(url, { method });
}

function makeResponse(status: number): Response {
  return new Response(null, { status });
}

function callOnResponse(request: Request, response: Response) {
  return refreshTokenMiddleware.onResponse!({
    request,
    response,
  } as Parameters<NonNullable<typeof refreshTokenMiddleware.onResponse>>[0]);
}

describe("refreshTokenMiddleware", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetCookie.mockReturnValue(null);
    vi.spyOn(globalThis, "fetch");
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("401이 아닌 응답은 그대로 반환한다", async () => {
    const request = makeRequest("https://example.com/api/data");
    const response = makeResponse(200);

    const result = await callOnResponse(request, response);

    expect(result).toBe(response);
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it("/api/auth/refresh 요청의 401 응답은 재발급을 시도하지 않는다", async () => {
    const request = makeRequest("https://example.com/api/auth/refresh", "POST");
    const response = makeResponse(401);

    const result = await callOnResponse(request, response);

    expect(result).toBe(response);
    expect(globalThis.fetch).not.toHaveBeenCalled();
    expect(mockClearSession).not.toHaveBeenCalled();
  });

  it("401 응답 시 토큰 재발급에 성공하면 원래 요청을 재시도한다", async () => {
    const request = makeRequest("https://example.com/api/data");
    const response = makeResponse(401);
    const retryResponse = makeResponse(200);

    vi.mocked(globalThis.fetch).mockResolvedValueOnce(makeResponse(200)).mockResolvedValueOnce(retryResponse);

    const result = await callOnResponse(request, response);

    expect(result).toBe(retryResponse);
    expect(globalThis.fetch).toHaveBeenCalledTimes(2);
    expect(mockClearSession).not.toHaveBeenCalled();
  });

  it("401 응답 시 토큰 재발급이 실패하면 세션을 초기화하고 원래 응답을 반환한다", async () => {
    const request = makeRequest("https://example.com/api/data");
    const response = makeResponse(401);

    vi.mocked(globalThis.fetch).mockResolvedValueOnce(makeResponse(401));

    const result = await callOnResponse(request, response);

    expect(result).toBe(response);
    expect(mockClearSession).toHaveBeenCalledOnce();
  });

  it("재발급 요청 중 네트워크 오류 발생 시 세션을 초기화하고 원래 응답을 반환한다", async () => {
    const request = makeRequest("https://example.com/api/data");
    const response = makeResponse(401);

    vi.mocked(globalThis.fetch).mockRejectedValueOnce(new Error("Network error"));

    const result = await callOnResponse(request, response);

    expect(result).toBe(response);
    expect(mockClearSession).toHaveBeenCalledOnce();
  });

  it("XSRF-TOKEN 쿠키가 있으면 재발급 요청에 X-XSRF-TOKEN 헤더를 포함한다", async () => {
    mockGetCookie.mockReturnValue("test-csrf-token");
    const request = makeRequest("https://example.com/api/data");
    const response = makeResponse(401);

    vi.mocked(globalThis.fetch).mockResolvedValueOnce(makeResponse(200)).mockResolvedValueOnce(makeResponse(200));

    await callOnResponse(request, response);

    expect(globalThis.fetch).toHaveBeenCalledWith(
      "/api/auth/refresh",
      expect.objectContaining({
        method: "POST",
        credentials: "include",
        headers: { "X-XSRF-TOKEN": "test-csrf-token" },
      }),
    );
  });

  it("XSRF-TOKEN 쿠키가 없으면 재발급 요청에 headers를 포함하지 않는다", async () => {
    mockGetCookie.mockReturnValue(null);
    const request = makeRequest("https://example.com/api/data");
    const response = makeResponse(401);

    vi.mocked(globalThis.fetch).mockResolvedValueOnce(makeResponse(200)).mockResolvedValueOnce(makeResponse(200));

    await callOnResponse(request, response);

    expect(globalThis.fetch).toHaveBeenCalledWith("/api/auth/refresh", expect.not.objectContaining({ headers: expect.anything() }));
  });

  it("재발급 진행 중 추가 401 응답은 같은 재발급 요청을 공유한다", async () => {
    let resolveRefresh!: (value: Response) => void;
    vi.mocked(globalThis.fetch).mockImplementationOnce(
      () =>
        new Promise<Response>((resolve) => {
          resolveRefresh = resolve;
        }),
    );

    const firstCall = callOnResponse(makeRequest("https://example.com/api/data1"), makeResponse(401));
    const secondCall = callOnResponse(makeRequest("https://example.com/api/data2"), makeResponse(401));

    expect(globalThis.fetch).toHaveBeenCalledTimes(1);

    resolveRefresh(makeResponse(401));
    await Promise.all([firstCall, secondCall]);

    expect(mockClearSession).toHaveBeenCalledTimes(2);
  });
});
