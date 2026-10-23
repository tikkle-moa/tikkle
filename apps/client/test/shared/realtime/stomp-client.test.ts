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
      headerParams: { receipt: "receipt-1" },
    } as never);

    expect(publish).toHaveBeenCalledWith({
      destination: "/api/performances/10/seats",
      headers: { receipt: "receipt-1" },
      body: JSON.stringify({ requestId: "request", data: { venueSeatIds: [1] } }),
    });
  });

  it("응답 구독은 성공과 오류를 각각의 콜백으로 전달한다", () => {
    const subscribe = vi.fn().mockReturnValue({ id: "response", unsubscribe: vi.fn() });
    mockClientConstructor.mockImplementationOnce(function (this: Record<string, unknown>) {
      Object.assign(this, { subscribe });
    });
    const client = new StompClient({ onConnect: vi.fn(), onWebSocketClose: vi.fn() });
    const callback = vi.fn();
    const errorCallback = vi.fn();
    client.subscribe({ path: "/performances/{performanceId}/get-seat-status", pathParams: { performanceId: 10 }, callback, errorCallback });
    expect(subscribe).toHaveBeenCalledWith("/user/queue/performances/10/get-seat-status", expect.any(Function), undefined);
    const handler = subscribe.mock.calls[0][1];
    const success = { requestId: "ok", success: true, data: {} };
    const failure = { requestId: "error", success: false, error: { code: "ERROR", message: "failed" } };
    handler({ body: JSON.stringify(success) });
    expect(callback).toHaveBeenCalledExactlyOnceWith(success);
    expect(errorCallback).not.toHaveBeenCalled();
    handler({ body: JSON.stringify(failure) });
    expect(errorCallback).toHaveBeenCalledExactlyOnceWith(failure);
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it("이벤트 구독은 공연 헤더를 문자열로 보내고 이벤트만 전달한다", () => {
    const subscribe = vi.fn().mockReturnValue({ id: "event", unsubscribe: vi.fn() });
    mockClientConstructor.mockImplementationOnce(function (this: Record<string, unknown>) {
      Object.assign(this, { subscribe });
    });
    const client = new StompClient({ onConnect: vi.fn(), onWebSocketClose: vi.fn() });
    const callback = vi.fn();
    client.subscribeEvent({ path: "/groups/{groupId}/chat", pathParams: { groupId: 1 }, headerParams: { performanceId: 10 }, callback });
    expect(subscribe).toHaveBeenCalledWith("/topic/groups/1/chat", expect.any(Function), { performanceId: "10" });
    const handler = subscribe.mock.calls[0][1];
    const event = { data: { content: "안녕하세요" } };
    handler({ body: JSON.stringify(event) });
    handler({ body: JSON.stringify({ error: { message: "failed" } }) });
    expect(callback).toHaveBeenCalledExactlyOnceWith(event);
  });

  it.each([
    { path: "/stomp-errors" as const, destination: "/user/queue/stomp-errors" },
    { path: "/groups/chat" as const, destination: "/user/queue/groups/chat" },
    {
      path: "/performances/{performanceId}/hold-seats" as const,
      pathParams: { performanceId: 10 },
      destination: "/user/queue/performances/10/hold-seats",
    },
  ])("오류 구독은 $destination 오류를 전달하고 구독을 해제한다", ({ destination, ...props }) => {
    const unsubscribe = vi.fn();
    const subscribe = vi.fn().mockReturnValue({ id: "error-subscription", unsubscribe });
    mockClientConstructor.mockImplementationOnce(function (this: Record<string, unknown>) {
      Object.assign(this, { connected: true, subscribe });
    });
    const client = new StompClient({ onConnect: vi.fn(), onWebSocketClose: vi.fn() });
    const errorCallback = vi.fn();
    const subscription =
      props.path === "/performances/{performanceId}/hold-seats"
        ? client.subscribeError({ path: props.path, pathParams: { performanceId: 10 }, errorCallback })
        : client.subscribeError({ path: props.path, errorCallback });
    expect(subscribe).toHaveBeenCalledWith(destination, expect.any(Function));
    const handler = subscribe.mock.calls[0][1];
    handler({ body: JSON.stringify({ success: true }) });
    expect(errorCallback).not.toHaveBeenCalled();
    const failure = { requestId: "request", success: false, error: { code: "ACCESS_DENIED", message: "권한이 없습니다." } };
    handler({ body: JSON.stringify(failure) });
    expect(errorCallback).toHaveBeenCalledExactlyOnceWith(failure);
    expect(subscription.id).toBe("error-subscription");
    subscription.unsubscribe();
    expect(unsubscribe).toHaveBeenCalledOnce();
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

  it("연결이 끊긴 상태에서는 구독 해제를 client에 위임하지 않는다", () => {
    const unsubscribe = vi.fn(() => {
      throw new Error("Already disconnected");
    });
    const subscribe = vi.fn(() => ({ id: "subscription-id", unsubscribe }));
    mockClientConstructor.mockImplementationOnce(function (this: Record<string, unknown>) {
      Object.assign(this, { connected: false, subscribe });
    });
    const client = new StompClient({ onConnect: vi.fn(), onWebSocketClose: vi.fn() });
    const subscription = client.subscribe({ path: "/orders", callback: vi.fn() } as never);

    expect(() => subscription.unsubscribe()).not.toThrow();
    expect(unsubscribe).not.toHaveBeenCalled();
  });

  it("연결된 상태에서는 구독 해제를 원본 구독에 위임한다", () => {
    const unsubscribe = vi.fn();
    const subscribe = vi.fn(() => ({ id: "subscription-id", unsubscribe }));
    const headers = { receipt: "receipt-1" };
    mockClientConstructor.mockImplementationOnce(function (this: Record<string, unknown>) {
      Object.assign(this, { connected: true, subscribe });
    });
    const client = new StompClient({ onConnect: vi.fn(), onWebSocketClose: vi.fn() });
    const subscription = client.subscribe({ path: "/orders", callback: vi.fn() } as never);

    subscription.unsubscribe(headers);

    expect(unsubscribe).toHaveBeenCalledWith(headers);
  });

  it("구독 해제 중 오류가 발생하면 예외를 전파하지 않는다", () => {
    const error = new Error("Already disconnected");
    vi.spyOn(console, "error").mockImplementation(() => {});
    const unsubscribe = vi.fn(() => {
      throw error;
    });
    const subscribe = vi.fn(() => ({ id: "subscription-id", unsubscribe }));
    mockClientConstructor.mockImplementationOnce(function (this: Record<string, unknown>) {
      Object.assign(this, { connected: true, subscribe });
    });
    const client = new StompClient({ onConnect: vi.fn(), onWebSocketClose: vi.fn() });
    const subscription = client.subscribe({ path: "/orders", callback: vi.fn() } as never);

    expect(() => subscription.unsubscribe()).not.toThrow();

    expect(unsubscribe).toHaveBeenCalledOnce();
  });

  it("구독 해제 중 연결이 끊긴 경우에도 예외를 전파하지 않는다", () => {
    const error = new Error("Already disconnected");
    const stompClientState = { connected: true };
    const unsubscribe = vi.fn(() => {
      stompClientState.connected = false;
      throw error;
    });
    const subscribe = vi.fn(() => ({ id: "subscription-id", unsubscribe }));
    mockClientConstructor.mockImplementationOnce(function (this: Record<string, unknown>) {
      Object.assign(this, { ...stompClientState, subscribe });
      Object.defineProperty(this, "connected", {
        get: () => stompClientState.connected,
      });
    });
    const client = new StompClient({ onConnect: vi.fn(), onWebSocketClose: vi.fn() });
    const subscription = client.subscribe({ path: "/orders", callback: vi.fn() } as never);

    expect(() => subscription.unsubscribe()).not.toThrow();

    expect(unsubscribe).toHaveBeenCalledOnce();
  });
});
