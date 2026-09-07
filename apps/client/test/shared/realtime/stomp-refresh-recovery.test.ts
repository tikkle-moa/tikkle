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

const createMockClient = () =>
  ({
    activate: mockActivate,
    deactivate: mockDeactivate,
    publish: vi.fn(),
  }) as unknown as Client;

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
    mockCreateStompClient.mockImplementation(createMockClient);
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

  it("HTTP refresh 성공 후 새 STOMP Client로 명령을 전송한다", async () => {
    let resolveRefresh!: (response: Response) => void;

    const clearSession = vi.fn();
    const sessionExpiredHandler = vi.fn();
    const middleware = createRefreshTokenMiddleware(clearSession);

    const firstClient = createMockClient();
    const secondClient = createMockClient();

    mockCreateStompClient.mockReturnValueOnce(firstClient).mockReturnValueOnce(secondClient);

    vi.mocked(globalThis.fetch)
      .mockImplementationOnce(
        () =>
          new Promise<Response>((resolve) => {
            resolveRefresh = resolve;
          }),
      )
      .mockResolvedValueOnce(new Response(null, { status: 200 }));

    useStompStore.getState().setSessionExpiredHandler(sessionExpiredHandler);
    useStompStore.getState().getClient();

    const httpRecovery = callOnResponse(middleware, new Request("https://example.com/api/data"), new Response(null, { status: 401 }));

    const stompRecovery = useStompStore.getState().recover();

    expect(globalThis.fetch).toHaveBeenCalledOnce();

    resolveRefresh(new Response(null, { status: 200 }));

    const [httpResult] = await Promise.all([httpRecovery, stompRecovery]);

    expect(httpResult).toEqual(expect.any(Response));
    expect(globalThis.fetch).toHaveBeenCalledTimes(2);

    expect(mockDeactivate).toHaveBeenCalledOnce();
    expect(mockCreateStompClient).toHaveBeenCalledTimes(2);
    expect(clearSession).not.toHaveBeenCalled();
    expect(sessionExpiredHandler).not.toHaveBeenCalled();

    const currentClient = useStompStore.getState().client;

    expect(currentClient).toBe(secondClient);

    currentClient?.publish({
      destination: "/app/performance/sync",
      body: JSON.stringify({
        requestId: "request-id",
        action: "START_CHECKOUT",
        data: {},
      }),
    });

    expect(secondClient.publish).toHaveBeenCalledOnce();
    expect(firstClient.publish).not.toHaveBeenCalled();
  });
});
