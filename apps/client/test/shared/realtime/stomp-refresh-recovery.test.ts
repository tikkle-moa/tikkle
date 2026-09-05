import type { Client } from "@stomp/stompjs";

import { createRefreshTokenMiddleware } from "@shared/api/refresh-token-middleware";
import type { getCookie } from "@shared/lib/cookie.utils";
import { useStompStore } from "@shared/realtime/stomp.store";

const { mockActivate, mockCreateStompClient, mockDeactivate, mockGetCookie } = vi.hoisted(() => ({
  mockActivate: vi.fn(),
  mockCreateStompClient: vi.fn(),
  mockDeactivate: vi.fn(),
  mockGetCookie: vi.fn<typeof getCookie>(),
}));

vi.mock("@shared/lib/cookie.utils", () => ({
  getCookie: mockGetCookie,
}));

vi.mock("@shared/realtime/stomp-client", () => ({
  createStompClient: mockCreateStompClient,
}));

const mockClient = {
  activate: mockActivate,
  deactivate: mockDeactivate,
} as unknown as Client;

function callOnResponse(middleware: ReturnType<typeof createRefreshTokenMiddleware>, request: Request, response: Response) {
  return middleware.onResponse!({
    request,
    response,
  } as Parameters<NonNullable<typeof middleware.onResponse>>[0]);
}

describe("STOMP refresh recovery", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();

    mockGetCookie.mockReturnValue(null);
    mockCreateStompClient.mockReturnValue(mockClient);
    mockDeactivate.mockResolvedValue(undefined);
    vi.spyOn(globalThis, "fetch");

    useStompStore.setState({
      client: null,
      connectionStatus: "disconnected",
      sessionExpiredHandler: null,
    });
  });

  afterEach(async () => {
    await useStompStore.getState().disconnect();
    vi.clearAllTimers();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("HTTP 401과 STOMP 복구가 동시에 발생하면 refresh 요청을 한 번만 전송하고 세션을 유지한다", async () => {
    let resolveRefresh!: (response: Response) => void;
    const clearSession = vi.fn();
    const sessionExpiredHandler = vi.fn();
    const middleware = createRefreshTokenMiddleware(clearSession);
    const retryResponse = new Response(null, { status: 200 });

    vi.mocked(globalThis.fetch)
      .mockImplementationOnce(
        () =>
          new Promise<Response>((resolve) => {
            resolveRefresh = resolve;
          }),
      )
      .mockResolvedValueOnce(retryResponse);

    useStompStore.getState().setSessionExpiredHandler(sessionExpiredHandler);
    useStompStore.getState().getClient();

    const httpRecovery = callOnResponse(middleware, new Request("https://example.com/api/data"), new Response(null, { status: 401 }));
    const stompRecovery = useStompStore.getState().recover();

    expect(globalThis.fetch).toHaveBeenCalledOnce();
    expect(globalThis.fetch).toHaveBeenCalledWith(
      "/api/auth/refresh",
      expect.objectContaining({
        method: "POST",
        credentials: "include",
      }),
    );

    resolveRefresh(new Response(null, { status: 200 }));

    const [httpResult] = await Promise.all([httpRecovery, stompRecovery]);

    expect(httpResult).toBe(retryResponse);
    expect(globalThis.fetch).toHaveBeenCalledTimes(2);
    expect(mockDeactivate).toHaveBeenCalledOnce();
    expect(clearSession).not.toHaveBeenCalled();
    expect(sessionExpiredHandler).not.toHaveBeenCalled();
  });
});
