import type { Client } from "@stomp/stompjs";

import type { createStompClient } from "@shared/realtime/stomp-client";
import { STOMP_RETRY_DELAY_MS } from "@shared/realtime/stomp.constants";
import { useStompStore } from "@shared/realtime/stomp.store";

type StompClientCallbacks = Parameters<typeof createStompClient>[0];

const { mockActivate, mockCreateStompClient, mockDeactivate, mockRefreshAccessToken } = vi.hoisted(() => ({
  mockActivate: vi.fn(),
  mockCreateStompClient: vi.fn(),
  mockDeactivate: vi.fn(),
  mockRefreshAccessToken: vi.fn(),
}));

vi.mock("@shared/api/refresh-token", () => ({
  refreshAccessToken: mockRefreshAccessToken,
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
    vi.useFakeTimers();
    vi.clearAllMocks();

    mockCreateStompClient.mockReturnValue(mockClient);
    mockDeactivate.mockResolvedValue(undefined);
    mockRefreshAccessToken.mockResolvedValue(true);

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

  it("연결 콜백에 따라 연결 상태를 갱신한다", () => {
    useStompStore.getState().getClient();

    const callbacks = mockCreateStompClient.mock.calls[0][0] as StompClientCallbacks;

    callbacks.onConnect();

    expect(useStompStore.getState().connectionStatus).toBe("connected");
  });

  it("WebSocket 종료 콜백은 복구를 시작한다", () => {
    useStompStore.getState().getClient();

    const callbacks = mockCreateStompClient.mock.calls[0][0] as StompClientCallbacks;
    const recover = vi.spyOn(useStompStore.getState(), "recover").mockResolvedValue(undefined);

    try {
      callbacks.onWebSocketClose();

      expect(recover).toHaveBeenCalledOnce();
    } finally {
      recover.mockRestore();
    }
  });

  it("토큰 갱신 성공 시 기존 연결을 해제하고 재연결한다", async () => {
    useStompStore.getState().getClient();

    await useStompStore.getState().recover();

    expect(mockRefreshAccessToken).toHaveBeenCalledOnce();
    expect(mockDeactivate).toHaveBeenCalledOnce();
    expect(useStompStore.getState().client).toBeNull();

    await vi.advanceTimersByTimeAsync(STOMP_RETRY_DELAY_MS);

    expect(mockCreateStompClient).toHaveBeenCalledTimes(2);
    expect(mockActivate).toHaveBeenCalledTimes(2);
  });

  it("토큰 갱신 실패 시 세션 만료 핸들러를 호출하고 재연결하지 않는다", async () => {
    const sessionExpiredHandler = vi.fn();

    mockRefreshAccessToken.mockResolvedValue(false);
    useStompStore.getState().setSessionExpiredHandler(sessionExpiredHandler);
    useStompStore.getState().getClient();

    await useStompStore.getState().recover();
    await vi.advanceTimersByTimeAsync(STOMP_RETRY_DELAY_MS);

    expect(mockDeactivate).toHaveBeenCalledOnce();
    expect(sessionExpiredHandler).toHaveBeenCalledOnce();
    expect(mockCreateStompClient).toHaveBeenCalledOnce();
    expect(useStompStore.getState().connectionStatus).toBe("disconnected");
  });

  it("토큰 갱신 요청 오류도 세션 만료로 처리한다", async () => {
    const sessionExpiredHandler = vi.fn();

    mockRefreshAccessToken.mockRejectedValueOnce(new Error("network error"));
    useStompStore.getState().setSessionExpiredHandler(sessionExpiredHandler);
    useStompStore.getState().getClient();

    await useStompStore.getState().recover();

    expect(sessionExpiredHandler).toHaveBeenCalledOnce();
    expect(useStompStore.getState().client).toBeNull();
  });

  it("이미 복구 중이면 토큰 갱신 요청을 중복 실행하지 않는다", async () => {
    let resolveRefresh!: (value: boolean) => void;

    mockRefreshAccessToken.mockImplementationOnce(
      () =>
        new Promise<boolean>((resolve) => {
          resolveRefresh = resolve;
        }),
    );

    useStompStore.getState().getClient();

    const firstRecovery = useStompStore.getState().recover();
    const secondRecovery = useStompStore.getState().recover();

    expect(mockRefreshAccessToken).toHaveBeenCalledOnce();

    resolveRefresh(true);

    await Promise.all([firstRecovery, secondRecovery]);

    expect(mockDeactivate).toHaveBeenCalledOnce();
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

  it("클라이언트가 없으면 recover는 아무 작업도 하지 않는다", async () => {
    await useStompStore.getState().recover();

    expect(mockRefreshAccessToken).not.toHaveBeenCalled();
    expect(useStompStore.getState().connectionStatus).toBe("disconnected");
  });

  it("토큰 갱신 중 연결을 해제하면 재연결하지 않는다", async () => {
    let resolveRefresh!: (value: boolean) => void;

    mockRefreshAccessToken.mockImplementationOnce(
      () =>
        new Promise<boolean>((resolve) => {
          resolveRefresh = resolve;
        }),
    );

    useStompStore.getState().getClient();

    const recovery = useStompStore.getState().recover();

    await useStompStore.getState().disconnect();

    resolveRefresh(true);
    await recovery;
    await vi.advanceTimersByTimeAsync(STOMP_RETRY_DELAY_MS);

    expect(mockDeactivate).toHaveBeenCalledOnce();
    expect(mockCreateStompClient).toHaveBeenCalledOnce();
    expect(useStompStore.getState().client).toBeNull();
  });

  it("해제된 이전 클라이언트의 종료 이벤트는 복구하지 않는다", async () => {
    useStompStore.getState().getClient();

    const callbacks = mockCreateStompClient.mock.calls[0][0] as StompClientCallbacks;

    await useStompStore.getState().disconnect();

    const recover = vi.spyOn(useStompStore.getState(), "recover").mockResolvedValue(undefined);

    try {
      callbacks.onWebSocketClose();

      expect(recover).not.toHaveBeenCalled();
    } finally {
      recover.mockRestore();
    }
  });
});
