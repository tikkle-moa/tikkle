import { createStompClient } from "@shared/realtime/stomp-client";
import { STOMP_BROKER_URL, STOMP_HEARTBEAT_INTERVAL_MS } from "@shared/realtime/stomp.constants";

const mockClientConstructor = vi.hoisted(() => vi.fn());

vi.mock("@stomp/stompjs", () => ({
  Client: mockClientConstructor,
}));

describe("createStompClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("STOMP 연결, heartbeat 및 lifecycle 콜백을 전달한다", () => {
    const onConnect = vi.fn();
    const onWebSocketClose = vi.fn();

    createStompClient({
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

    createStompClient({
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
});
