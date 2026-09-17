import StompClient from "@shared/realtime/stomp-client";
import { STOMP_BROKER_URL, STOMP_HEARTBEAT_INTERVAL_MS } from "@shared/realtime/stomp.constants";

const mockClientConstructor = vi.hoisted(() => vi.fn());

vi.mock("@stomp/stompjs", () => ({
  Client: mockClientConstructor,
}));

describe("StompClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("STOMP 연결, heartbeat 및 lifecycle 콜백을 전달한다", () => {
    const onConnect = vi.fn();
    const onWebSocketClose = vi.fn();

    new StompClient({
      onConnect,
      onWebSocketClose,
    });

    expect(mockClientConstructor).toHaveBeenCalledWith(
      expect.objectContaining({
        brokerURL: STOMP_BROKER_URL,
        reconnectDelay: 0,
        heartbeatIncoming: STOMP_HEARTBEAT_INTERVAL_MS,
        heartbeatOutgoing: STOMP_HEARTBEAT_INTERVAL_MS,
        onConnect,
        onWebSocketClose,
      }),
    );
  });

  it("broker ERROR frame의 메시지를 로그로 남긴다", () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    new StompClient({
      onConnect: vi.fn(),
      onWebSocketClose: vi.fn(),
    });

    const config = mockClientConstructor.mock.calls[0][0] as {
      onStompError: (frame: { headers: { message: string } }) => void;
    };

    config.onStompError({
      headers: { message: "invalid command" },
    });

    expect(consoleError).toHaveBeenCalledWith("STOMP broker error:", "invalid command");
  });

  it("activate와 deactivate를 client에 위임한다", async () => {
    const deactivate = vi.fn().mockResolvedValue(undefined);
    const activate = vi.fn();
    mockClientConstructor.mockImplementationOnce(function (this: Record<string, unknown>) {
      Object.assign(this, { activate, deactivate });
    });
    const client = new StompClient({ onConnect: vi.fn(), onWebSocketClose: vi.fn() });

    client.activate();
    await client.deactivate();

    expect(activate).toHaveBeenCalledOnce();
    expect(deactivate).toHaveBeenCalledOnce();
  });

  it("publish는 prefix와 path parameter를 적용한다", () => {
    const publish = vi.fn();
    mockClientConstructor.mockImplementationOnce(function (this: Record<string, unknown>) {
      Object.assign(this, { publish });
    });
    const client = new StompClient({ onConnect: vi.fn(), onWebSocketClose: vi.fn() });

    client.publish({
      path: "/performances/{performanceId}/seats",
      pathParams: { performanceId: 10 },
      command: { requestId: "request", data: { venueSeatIds: [1] } },
      headers: { receipt: "receipt-1" },
    } as never);

    expect(publish).toHaveBeenCalledWith({
      destination: "/api/performances/10/seats",
      headers: { receipt: "receipt-1" },
      body: JSON.stringify({ requestId: "request", data: { venueSeatIds: [1] } }),
    });
  });

  it("subscribe와 event subscribe는 성공 및 실패 frame을 전달한다", () => {
    const subscribe = vi.fn();
    mockClientConstructor.mockImplementationOnce(function (this: Record<string, unknown>) {
      Object.assign(this, { subscribe });
    });
    const client = new StompClient({ onConnect: vi.fn(), onWebSocketClose: vi.fn() });
    const callback = vi.fn();
    const errorCallback = vi.fn();
    const subscription = { unsubscribe: vi.fn() };
    subscribe.mockImplementation((_destination, handler) => {
      handler({ body: JSON.stringify({ requestId: "ok", success: true }) });
      handler({ body: JSON.stringify({ requestId: "error", error: { code: "ERROR", message: "failed" } }) });
      return subscription;
    });

    expect(client.subscribe({ path: "/orders", callback, errorCallback } as never)).toBe(subscription);
    expect(
      client.subscribeEvent({ path: "/performances/{performanceId}", pathParams: { performanceId: 10 }, callback, errorCallback } as never),
    ).toBe(subscription);

    expect(subscribe).toHaveBeenCalledWith("/user/queue/orders", expect.any(Function), undefined);
    expect(subscribe).toHaveBeenCalledWith("/topic/performances/10", expect.any(Function), undefined);
    expect(callback).toHaveBeenCalledWith({ requestId: "ok", success: true });
    expect(errorCallback).toHaveBeenCalledWith({ requestId: "error", error: { code: "ERROR", message: "failed" } });

    client.subscribe({ path: "/orders/{orderId}", pathParams: { orderId: 10 }, callback } as never);
    client.subscribeEvent({ path: "/performances", callback } as never);

    expect(subscribe).toHaveBeenCalledWith("/user/queue/orders/10", expect.any(Function), undefined);
    expect(subscribe).toHaveBeenCalledWith("/topic/performances", expect.any(Function), undefined);
  });

  it("필수 path parameter가 없으면 오류를 던진다", () => {
    mockClientConstructor.mockImplementationOnce(function (this: Record<string, unknown>) {
      Object.assign(this, { publish: vi.fn() });
    });
    const client = new StompClient({ onConnect: vi.fn(), onWebSocketClose: vi.fn() });

    expect(() => client.publish({ path: "/performances/{performanceId}", command: {} } as never)).toThrow("Missing path parameter: performanceId");
  });

  it("오류 frame에 errorCallback이 없으면 callback을 호출하지 않고 종료한다", () => {
    const subscribe = vi.fn();
    mockClientConstructor.mockImplementationOnce(function (this: Record<string, unknown>) {
      Object.assign(this, { subscribe });
    });
    const client = new StompClient({ onConnect: vi.fn(), onWebSocketClose: vi.fn() });
    const callback = vi.fn();
    subscribe.mockImplementation((_destination, handler) => {
      handler({ body: JSON.stringify({ requestId: "error", error: { code: "ERROR", message: "failed" } }) });
      return { unsubscribe: vi.fn() };
    });

    client.subscribe({ path: "/orders", callback } as never);

    expect(callback).not.toHaveBeenCalled();
  });
});
