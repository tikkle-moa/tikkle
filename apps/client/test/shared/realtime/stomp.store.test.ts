import type { Client } from "@stomp/stompjs";

import type { RefreshResult } from "@shared/api/refresh-token.types";
import type { createStompClient } from "@shared/realtime/stomp-client";
import { STOMP_RETRY_DELAY_MS } from "@shared/realtime/stomp.constants";
import { useStompStore } from "@shared/realtime/stomp.store";

type StompClientCallbacks = Parameters<typeof createStompClient>[0];

const { mockActivate, mockCreateStompClient, mockDeactivate, mockRefreshAccessToken, mockSubscribeAccessTokenRefresh, getRefreshListener } =
  vi.hoisted(() => {
    let listener: (() => void | Promise<void>) | undefined;

    return {
      mockActivate: vi.fn(),
      mockCreateStompClient: vi.fn(),
      mockDeactivate: vi.fn(),
      mockRefreshAccessToken: vi.fn(),
      mockSubscribeAccessTokenRefresh: vi.fn((nextListener: () => void | Promise<void>) => {
        listener = nextListener;
      }),
      getRefreshListener: () => listener,
    };
  });

vi.mock("@shared/api/refresh-token", () => ({
  refreshAccessToken: mockRefreshAccessToken,
  subscribeAccessTokenRefresh: mockSubscribeAccessTokenRefresh,
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
    vi.spyOn(console, "error").mockImplementation(() => {});

    mockCreateStompClient.mockReturnValue(mockClient);
    mockDeactivate.mockResolvedValue(undefined);
    mockRefreshAccessToken.mockResolvedValue({ type: "success" });

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

  it("refresh 성공 알림을 받으면 기존 Client를 해제하고 새 Client로 교체한다", async () => {
    const firstClient = {
      activate: mockActivate,
      deactivate: mockDeactivate,
    } as unknown as Client;

    const secondClient = {
      activate: mockActivate,
      deactivate: mockDeactivate,
    } as unknown as Client;

    mockCreateStompClient.mockReturnValueOnce(firstClient).mockReturnValueOnce(secondClient);

    useStompStore.getState().getClient();

    await useStompStore.getState().reconnectAfterRefresh();

    expect(mockDeactivate).toHaveBeenCalledOnce();
    expect(mockCreateStompClient).toHaveBeenCalledTimes(2);
    expect(mockActivate).toHaveBeenCalledTimes(2);
    expect(useStompStore.getState().client).toBe(secondClient);
    expect(useStompStore.getState().connectionStatus).toBe("connecting");
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

  it("토큰 갱신 성공 시 기존 연결을 해제하고 즉시 재연결한다", async () => {
    useStompStore.getState().getClient();

    await useStompStore.getState().recover();

    expect(mockRefreshAccessToken).toHaveBeenCalledOnce();
    expect(mockDeactivate).toHaveBeenCalledOnce();
    expect(mockCreateStompClient).toHaveBeenCalledTimes(2);
    expect(mockActivate).toHaveBeenCalledTimes(2);
    expect(useStompStore.getState().connectionStatus).toBe("connecting");
  });

  it("인증 갱신 실패 시 세션 만료 핸들러를 호출하고 재연결하지 않는다", async () => {
    const sessionExpiredHandler = vi.fn();

    mockRefreshAccessToken.mockResolvedValue({ type: "authentication-failed" });
    useStompStore.getState().setSessionExpiredHandler(sessionExpiredHandler);
    useStompStore.getState().getClient();

    await useStompStore.getState().recover();

    expect(mockDeactivate).toHaveBeenCalledOnce();
    expect(sessionExpiredHandler).toHaveBeenCalledOnce();
    expect(mockCreateStompClient).toHaveBeenCalledOnce();
    expect(useStompStore.getState().connectionStatus).toBe("disconnected");
  });

  it("일시적인 갱신 실패 시 세션을 유지하고 재연결을 예약한다", async () => {
    const sessionExpiredHandler = vi.fn();

    mockRefreshAccessToken.mockResolvedValue({ type: "retryable-failed" });
    useStompStore.getState().setSessionExpiredHandler(sessionExpiredHandler);
    useStompStore.getState().getClient();

    await useStompStore.getState().recover();

    expect(mockDeactivate).toHaveBeenCalledOnce();
    expect(sessionExpiredHandler).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(STOMP_RETRY_DELAY_MS);

    expect(mockCreateStompClient).toHaveBeenCalledTimes(2);
    expect(mockActivate).toHaveBeenCalledTimes(2);
  });

  it("일시적인 갱신 실패가 반복되면 재연결 대기 시간을 증가시킨다", async () => {
    mockRefreshAccessToken.mockResolvedValue({ type: "retryable-failed" });
    useStompStore.getState().getClient();

    await useStompStore.getState().recover();
    await vi.advanceTimersByTimeAsync(STOMP_RETRY_DELAY_MS);

    await useStompStore.getState().recover();
    await vi.advanceTimersByTimeAsync(STOMP_RETRY_DELAY_MS * 2 - 1);

    expect(mockCreateStompClient).toHaveBeenCalledTimes(2);

    await vi.advanceTimersByTimeAsync(1);

    expect(mockCreateStompClient).toHaveBeenCalledTimes(3);
  });

  it("인증 갱신 실패 중 Client 종료 오류가 발생해도 세션 만료 처리 후 복구를 완료한다", async () => {
    const sessionExpiredHandler = vi.fn();
    const disconnectError = new Error("disconnect failed");

    mockRefreshAccessToken.mockResolvedValue({
      type: "authentication-failed",
    });
    mockDeactivate.mockRejectedValueOnce(disconnectError);

    useStompStore.getState().setSessionExpiredHandler(sessionExpiredHandler);
    useStompStore.getState().getClient();

    await expect(useStompStore.getState().recover()).resolves.toBeUndefined();

    expect(console.error).toHaveBeenCalledWith("STOMP 인증 실패 후 연결 종료 실패:", disconnectError);
    expect(sessionExpiredHandler).toHaveBeenCalledOnce();
    expect(useStompStore.getState().client).toBeNull();
    expect(useStompStore.getState().connectionStatus).toBe("disconnected");
  });

  it("이미 복구 중이면 토큰 갱신 요청을 중복 실행하지 않는다", async () => {
    let resolveRefresh!: (value: RefreshResult) => void;

    mockRefreshAccessToken.mockImplementationOnce(
      () =>
        new Promise<RefreshResult>((resolve) => {
          resolveRefresh = resolve;
        }),
    );

    useStompStore.getState().getClient();

    const firstRecovery = useStompStore.getState().recover();
    const secondRecovery = useStompStore.getState().recover();

    expect(mockRefreshAccessToken).toHaveBeenCalledOnce();

    resolveRefresh({ type: "success" });

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
    let resolveRefresh!: (value: RefreshResult) => void;

    mockRefreshAccessToken.mockImplementationOnce(
      () =>
        new Promise<RefreshResult>((resolve) => {
          resolveRefresh = resolve;
        }),
    );

    useStompStore.getState().getClient();

    const recovery = useStompStore.getState().recover();

    await useStompStore.getState().disconnect();

    resolveRefresh({ type: "success" });
    await recovery;
    await vi.advanceTimersByTimeAsync(STOMP_RETRY_DELAY_MS);

    expect(mockDeactivate).toHaveBeenCalledOnce();
    expect(mockCreateStompClient).toHaveBeenCalledOnce();
    expect(useStompStore.getState().client).toBeNull();
  });

  it("토큰 갱신 후 연결 실패가 반복되어도 refresh 없이 backoff 재연결한다", async () => {
    let secondCallbacks!: StompClientCallbacks;
    let thirdCallbacks!: StompClientCallbacks;

    const secondClient = {
      activate: vi.fn(),
      deactivate: vi.fn().mockResolvedValue(undefined),
    } as unknown as Client;

    const thirdClient = {
      activate: vi.fn(),
      deactivate: vi.fn().mockResolvedValue(undefined),
    } as unknown as Client;

    const fourthClient = {
      activate: vi.fn(),
      deactivate: vi.fn().mockResolvedValue(undefined),
    } as unknown as Client;

    mockCreateStompClient
      .mockReturnValueOnce(mockClient)
      .mockImplementationOnce((callbacks: StompClientCallbacks) => {
        secondCallbacks = callbacks;
        return secondClient;
      })
      .mockImplementationOnce((callbacks: StompClientCallbacks) => {
        thirdCallbacks = callbacks;
        return thirdClient;
      })
      .mockReturnValueOnce(fourthClient);

    useStompStore.getState().getClient();

    await useStompStore.getState().recover();

    expect(mockRefreshAccessToken).toHaveBeenCalledOnce();
    expect(mockCreateStompClient).toHaveBeenCalledTimes(2);

    secondCallbacks.onWebSocketClose();

    expect(mockRefreshAccessToken).toHaveBeenCalledOnce();

    await vi.advanceTimersByTimeAsync(STOMP_RETRY_DELAY_MS - 1);

    expect(mockCreateStompClient).toHaveBeenCalledTimes(2);

    await vi.advanceTimersByTimeAsync(1);

    expect(mockCreateStompClient).toHaveBeenCalledTimes(3);
    expect(mockRefreshAccessToken).toHaveBeenCalledOnce();

    thirdCallbacks.onWebSocketClose();

    await vi.advanceTimersByTimeAsync(STOMP_RETRY_DELAY_MS * 2);

    expect(mockCreateStompClient).toHaveBeenCalledTimes(4);
    expect(mockRefreshAccessToken).toHaveBeenCalledOnce();
  });

  it("이전 recovery가 남아 있어도 새 Client의 recovery를 가로채지 않는다", async () => {
    let resolveFirstRefresh!: (result: RefreshResult) => void;
    let resolveSecondRefresh!: (result: RefreshResult) => void;

    const firstClient = {
      activate: mockActivate,
      deactivate: mockDeactivate,
    } as unknown as Client;

    const secondClient = {
      activate: mockActivate,
      deactivate: mockDeactivate,
    } as unknown as Client;

    const thirdClient = {
      activate: mockActivate,
      deactivate: mockDeactivate,
    } as unknown as Client;

    mockCreateStompClient.mockReturnValueOnce(firstClient).mockReturnValueOnce(secondClient).mockReturnValueOnce(thirdClient);

    mockRefreshAccessToken
      .mockImplementationOnce(
        () =>
          new Promise<RefreshResult>((resolve) => {
            resolveFirstRefresh = resolve;
          }),
      )
      .mockImplementationOnce(
        () =>
          new Promise<RefreshResult>((resolve) => {
            resolveSecondRefresh = resolve;
          }),
      );

    useStompStore.getState().getClient();

    const firstRecovery = useStompStore.getState().recover();

    expect(mockRefreshAccessToken).toHaveBeenCalledOnce();

    await useStompStore.getState().disconnect();

    useStompStore.getState().getClient();

    const secondRecovery = useStompStore.getState().recover();

    expect(mockRefreshAccessToken).toHaveBeenCalledTimes(2);

    const duplicateRecovery = useStompStore.getState().recover();

    // 동일한 recovery를 사용하므로 refresh 요청은 추가로 발생하지 않아야 한다.
    expect(mockRefreshAccessToken).toHaveBeenCalledTimes(2);

    resolveFirstRefresh({ type: "success" });
    await firstRecovery;

    expect(mockRefreshAccessToken).toHaveBeenCalledTimes(2);
    expect(useStompStore.getState().client).toBe(secondClient);

    resolveSecondRefresh({ type: "success" });

    await Promise.all([secondRecovery, duplicateRecovery]);

    expect(mockDeactivate).toHaveBeenCalledTimes(2);
    expect(mockCreateStompClient).toHaveBeenCalledTimes(3);
    expect(useStompStore.getState().client).toBe(thirdClient);
  });

  it("교체된 이전 Client의 connect 콜백은 연결 상태를 변경하지 않는다", async () => {
    const firstClient = {
      activate: vi.fn(),
      deactivate: vi.fn().mockResolvedValue(undefined),
    } as unknown as Client;

    const secondClient = {
      activate: vi.fn(),
      deactivate: vi.fn().mockResolvedValue(undefined),
    } as unknown as Client;

    mockCreateStompClient.mockReturnValueOnce(firstClient).mockReturnValueOnce(secondClient);

    useStompStore.getState().getClient();

    const firstCallbacks = mockCreateStompClient.mock.calls[0][0] as StompClientCallbacks;

    await useStompStore.getState().reconnectAfterRefresh();

    const secondCallbacks = mockCreateStompClient.mock.calls[1][0] as StompClientCallbacks;

    firstCallbacks.onConnect();

    expect(useStompStore.getState().client).toBe(secondClient);
    expect(useStompStore.getState().connectionStatus).toBe("connecting");

    secondCallbacks.onConnect();

    expect(useStompStore.getState().connectionStatus).toBe("connected");
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

  it("Client 생성 중 lifecycle이 변경되면 재연결을 예약하지 않는다", async () => {
    mockCreateStompClient.mockReturnValueOnce(mockClient).mockImplementationOnce(() => {
      // getClient() 내부에서 Client 생성 중 연결 해제가 발생한 상황
      void useStompStore.getState().disconnect();

      throw new Error("client creation failed");
    });

    useStompStore.getState().getClient();

    await useStompStore.getState().reconnectAfterRefresh();
    await vi.advanceTimersByTimeAsync(STOMP_RETRY_DELAY_MS);

    expect(mockCreateStompClient).toHaveBeenCalledTimes(2);
    expect(useStompStore.getState().client).toBeNull();
  });

  it("Client 종료 실패 중 lifecycle이 변경되면 재연결하지 않는다", async () => {
    let rejectDeactivate!: (reason?: unknown) => void;

    mockDeactivate.mockImplementationOnce(
      () =>
        new Promise<void>((_, reject) => {
          rejectDeactivate = reject;
        }),
    );

    useStompStore.getState().getClient();

    const reconnectPromise = useStompStore.getState().reconnectAfterRefresh();

    await vi.waitFor(() => {
      expect(mockDeactivate).toHaveBeenCalledOnce();
    });

    // reconnectAfterRefresh가 저장한 lifecycleVersion을 변경한다.
    await useStompStore.getState().disconnect();

    rejectDeactivate(new Error("deactivate failed"));
    await reconnectPromise;

    await vi.advanceTimersByTimeAsync(STOMP_RETRY_DELAY_MS);

    expect(mockCreateStompClient).toHaveBeenCalledOnce();
    expect(useStompStore.getState().client).toBeNull();
  });

  it("클라이언트가 없으면 재연결하지 않는다", async () => {
    await useStompStore.getState().reconnectAfterRefresh();

    expect(mockDeactivate).not.toHaveBeenCalled();
    expect(mockCreateStompClient).not.toHaveBeenCalled();
  });

  it("이미 예약된 재연결 timer는 중복으로 등록하지 않는다", async () => {
    mockRefreshAccessToken.mockResolvedValue({
      type: "retryable-failed",
    });

    useStompStore.getState().getClient();
    await useStompStore.getState().recover();

    useStompStore.setState({
      client: mockClient,
      connectionStatus: "connecting",
    });

    await useStompStore.getState().recover();
    await vi.advanceTimersByTimeAsync(STOMP_RETRY_DELAY_MS);

    expect(mockCreateStompClient).toHaveBeenCalledTimes(2);
  });

  it("예약된 재연결 중 lifecycle이 변경되면 추가 재연결을 예약하지 않는다", async () => {
    const creationError = new Error("timer lifecycle changed");

    mockRefreshAccessToken.mockResolvedValue({
      type: "retryable-failed",
    });

    useStompStore.getState().getClient();

    mockCreateStompClient.mockImplementationOnce(() => {
      // timer callback 내부에서 lifecycleVersion을 변경한다.
      void useStompStore.getState().disconnect();

      throw creationError;
    });

    await useStompStore.getState().recover();

    // 첫 번째 backoff timer에서 Client 생성 실패
    await vi.advanceTimersByTimeAsync(STOMP_RETRY_DELAY_MS);

    expect(mockCreateStompClient).toHaveBeenCalledTimes(2);
    expect(console.error).toHaveBeenCalledWith("STOMP Client 재연결 실패:", creationError);

    // lifecycleVersion이 변경되었으므로 다음 retry timer는 생성되지 않는다.
    await vi.advanceTimersByTimeAsync(STOMP_RETRY_DELAY_MS * 2);

    expect(mockCreateStompClient).toHaveBeenCalledTimes(2);
    expect(useStompStore.getState().client).toBeNull();
  });

  it("재연결 timer 실행 시 이미 Client가 있으면 중복 생성하지 않는다", async () => {
    mockRefreshAccessToken.mockResolvedValue({
      type: "retryable-failed",
    });

    useStompStore.getState().getClient();
    await useStompStore.getState().recover();

    useStompStore.setState({
      client: mockClient,
      connectionStatus: "connecting",
    });

    await vi.advanceTimersByTimeAsync(STOMP_RETRY_DELAY_MS);

    expect(mockCreateStompClient).toHaveBeenCalledOnce();
  });

  it("disconnect는 예약된 재연결 timer를 취소한다", async () => {
    mockRefreshAccessToken.mockResolvedValue({
      type: "retryable-failed",
    });

    useStompStore.getState().getClient();
    await useStompStore.getState().recover();

    await useStompStore.getState().disconnect();
    await vi.advanceTimersByTimeAsync(STOMP_RETRY_DELAY_MS);

    expect(mockCreateStompClient).toHaveBeenCalledOnce();
  });

  it("기존 Client 종료 실패 시 재연결을 예약한다", async () => {
    mockDeactivate.mockRejectedValueOnce(new Error("deactivate failed"));

    useStompStore.getState().getClient();
    await useStompStore.getState().reconnectAfterRefresh();

    expect(useStompStore.getState().client).toBeNull();
    expect(useStompStore.getState().connectionStatus).toBe("disconnected");

    await vi.advanceTimersByTimeAsync(STOMP_RETRY_DELAY_MS);

    expect(mockCreateStompClient).toHaveBeenCalledTimes(2);
  });

  it("Client 종료 중 lifecycle이 변경되면 새 Client를 만들지 않는다", async () => {
    let resolveDeactivate!: () => void;

    mockDeactivate.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          resolveDeactivate = resolve;
        }),
    );

    useStompStore.getState().getClient();

    const reconnectPromise = useStompStore.getState().reconnectAfterRefresh();

    await vi.waitFor(() => {
      expect(mockDeactivate).toHaveBeenCalledOnce();
    });

    await useStompStore.getState().disconnect();

    resolveDeactivate();
    await reconnectPromise;

    expect(mockCreateStompClient).toHaveBeenCalledOnce();
  });

  it("새 Client 생성 실패 시 backoff 재연결을 예약한다", async () => {
    const recoveredClient = {
      activate: vi.fn(),
      deactivate: vi.fn().mockResolvedValue(undefined),
    } as unknown as Client;

    mockCreateStompClient
      .mockReturnValueOnce(mockClient)
      .mockImplementationOnce(() => {
        throw new Error("client creation failed");
      })
      .mockReturnValueOnce(recoveredClient);

    useStompStore.getState().getClient();
    await useStompStore.getState().reconnectAfterRefresh();

    expect(useStompStore.getState().client).toBeNull();

    await vi.advanceTimersByTimeAsync(STOMP_RETRY_DELAY_MS);

    expect(mockCreateStompClient).toHaveBeenCalledTimes(3);
    expect(useStompStore.getState().client).toBe(recoveredClient);
    expect(recoveredClient.activate).toHaveBeenCalledOnce();
  });

  it("예약된 재연결 중 Client 생성 실패 시 다음 backoff로 재시도한다", async () => {
    const recoveredClient = {
      activate: vi.fn(),
      deactivate: vi.fn().mockResolvedValue(undefined),
    } as unknown as Client;

    mockRefreshAccessToken.mockResolvedValue({
      type: "retryable-failed",
    });

    mockCreateStompClient
      .mockReturnValueOnce(mockClient)
      .mockImplementationOnce(() => {
        throw new Error("timer client creation failed");
      })
      .mockReturnValueOnce(recoveredClient);

    useStompStore.getState().getClient();

    await useStompStore.getState().recover();

    // 첫 번째 backoff timer 실행
    await vi.advanceTimersByTimeAsync(STOMP_RETRY_DELAY_MS);

    expect(mockCreateStompClient).toHaveBeenCalledTimes(2);
    expect(useStompStore.getState().client).toBeNull();
    expect(console.error).toHaveBeenCalledWith("STOMP Client 재연결 실패:", expect.any(Error));

    // 실패 후 증가한 backoff timer 실행
    await vi.advanceTimersByTimeAsync(STOMP_RETRY_DELAY_MS * 2);

    expect(mockCreateStompClient).toHaveBeenCalledTimes(3);
    expect(useStompStore.getState().client).toBe(recoveredClient);
    expect(recoveredClient.activate).toHaveBeenCalledOnce();
  });

  it("retryable 복구 중 disconnect가 발생하면 재연결을 예약하지 않는다", async () => {
    let resolveDeactivate!: () => void;

    mockRefreshAccessToken.mockResolvedValue({
      type: "retryable-failed",
    });

    mockDeactivate.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          resolveDeactivate = resolve;
        }),
    );

    useStompStore.getState().getClient();

    const recoveryPromise = useStompStore.getState().recover();

    await vi.waitFor(() => {
      expect(mockDeactivate).toHaveBeenCalledOnce();
    });

    await useStompStore.getState().disconnect();

    resolveDeactivate();
    await recoveryPromise;
    await vi.advanceTimersByTimeAsync(STOMP_RETRY_DELAY_MS);

    expect(mockCreateStompClient).toHaveBeenCalledOnce();
  });

  it("AccessToken 갱신 리스너가 STOMP 재연결을 호출한다", async () => {
    const reconnectAfterRefresh = vi.spyOn(useStompStore.getState(), "reconnectAfterRefresh").mockResolvedValue(undefined);

    const listener = getRefreshListener();

    expect(listener).toBeDefined();

    await listener?.();

    expect(reconnectAfterRefresh).toHaveBeenCalledOnce();

    reconnectAfterRefresh.mockRestore();
  });

  it("토큰 갱신 요청 예외 시 세션을 유지하고 재연결을 예약한다", async () => {
    const refreshError = new Error("refresh request failed");

    mockRefreshAccessToken.mockRejectedValueOnce(refreshError);

    useStompStore.getState().getClient();

    await useStompStore.getState().recover();

    expect(console.error).toHaveBeenCalledWith("STOMP recover 실패:", refreshError);
    expect(useStompStore.getState().connectionStatus).toBe("disconnected");

    await vi.advanceTimersByTimeAsync(STOMP_RETRY_DELAY_MS);

    expect(mockCreateStompClient).toHaveBeenCalledTimes(2);
  });

  it("토큰 갱신 예외 전에 연결이 해제되면 재연결하지 않는다", async () => {
    let rejectRefresh!: (reason?: unknown) => void;

    mockRefreshAccessToken.mockImplementationOnce(
      () =>
        new Promise<RefreshResult>((_, reject) => {
          rejectRefresh = reject;
        }),
    );

    useStompStore.getState().getClient();

    const recovery = useStompStore.getState().recover();

    await useStompStore.getState().disconnect();

    const refreshError = new Error("refresh request failed");

    rejectRefresh(refreshError);
    await recovery;
    await vi.advanceTimersByTimeAsync(STOMP_RETRY_DELAY_MS);

    expect(console.error).toHaveBeenCalledWith("STOMP recover 실패:", refreshError);
    expect(mockCreateStompClient).toHaveBeenCalledOnce();
    expect(useStompStore.getState().client).toBeNull();
  });

  it("재시도 가능한 복구 중 Client 종료가 실패해도 backoff 재연결을 예약한다", async () => {
    const deactivateError = new Error("recover deactivate failed");

    mockRefreshAccessToken.mockResolvedValueOnce({
      type: "retryable-failed",
    });
    mockDeactivate.mockRejectedValueOnce(deactivateError);

    useStompStore.getState().getClient();

    await useStompStore.getState().recover();

    expect(console.error).toHaveBeenCalledWith("STOMP recover 종료 실패:", deactivateError);
    expect(useStompStore.getState().client).toBeNull();

    await vi.advanceTimersByTimeAsync(STOMP_RETRY_DELAY_MS);

    expect(mockCreateStompClient).toHaveBeenCalledTimes(2);
  });
});
