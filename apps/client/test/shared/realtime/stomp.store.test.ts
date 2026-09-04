import type { Client } from "@stomp/stompjs";

import type { createStompClient } from "@shared/realtime/stomp-client";
import { useStompStore } from "@shared/realtime/stomp.store";

type StompClientCallbacks = Parameters<typeof createStompClient>[0];

const { mockActivate, mockCreateStompClient, mockDeactivate } = vi.hoisted(() => ({
  mockActivate: vi.fn(),
  mockCreateStompClient: vi.fn(),
  mockDeactivate: vi.fn(),
}));

vi.mock("@shared/realtime/stomp-client", () => ({
  createStompClient: mockCreateStompClient,
}));

const mockClient = {
  activate: mockActivate,
  deactivate: mockDeactivate,
} as unknown as Client;

describe("useStompStore", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockCreateStompClient.mockReturnValue(mockClient);
    mockDeactivate.mockResolvedValue(undefined);

    useStompStore.setState({
      client: null,
      connectionStatus: "disconnected",
    });
  });

  it("getClient 호출 전에는 STOMP 클라이언트를 생성하지 않는다", () => {
    expect(useStompStore.getState().client).toBeNull();
    expect(mockCreateStompClient).not.toHaveBeenCalled();
  });

  it("최초 getClient 호출 시 클라이언트를 생성하고 활성화한다", () => {
    const client = useStompStore.getState().getClient();

    expect(client).toBe(mockClient);
    expect(mockCreateStompClient).toHaveBeenCalledOnce();
    expect(mockActivate).toHaveBeenCalledOnce();
    expect(useStompStore.getState().connectionStatus).toBe("connecting");
  });

  it("이미 생성된 클라이언트가 있으면 같은 인스턴스를 재사용한다", () => {
    const firstClient = useStompStore.getState().getClient();
    const secondClient = useStompStore.getState().getClient();

    expect(secondClient).toBe(firstClient);
    expect(mockCreateStompClient).toHaveBeenCalledOnce();
    expect(mockActivate).toHaveBeenCalledOnce();
  });

  it("연결 및 종료 콜백에 따라 연결 상태를 갱신한다", () => {
    useStompStore.getState().getClient();

    const callbacks = mockCreateStompClient.mock.calls[0][0] as StompClientCallbacks;

    callbacks.onConnect();

    expect(useStompStore.getState().connectionStatus).toBe("connected");

    callbacks.onWebSocketClose();

    expect(useStompStore.getState().connectionStatus).toBe("disconnected");
  });

  it("disconnect 시 클라이언트를 비활성화하고 상태를 초기화한다", async () => {
    useStompStore.getState().getClient();

    await useStompStore.getState().disconnect();

    expect(mockDeactivate).toHaveBeenCalledOnce();
    expect(useStompStore.getState().client).toBeNull();
    expect(useStompStore.getState().connectionStatus).toBe("disconnected");
  });

  it("클라이언트가 없으면 disconnect는 아무 작업도 하지 않는다", async () => {
    await useStompStore.getState().disconnect();

    expect(mockDeactivate).not.toHaveBeenCalled();
    expect(useStompStore.getState().client).toBeNull();
    expect(useStompStore.getState().connectionStatus).toBe("disconnected");
  });
});
