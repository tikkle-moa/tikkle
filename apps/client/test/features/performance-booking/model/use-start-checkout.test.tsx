import { act, renderHook } from "@testing-library/react";
import type { StartCheckoutMessage, StompFailureMessage } from "@tikkle/api-types";

import type StompClient from "@shared/realtime/stomp-client";
import { useStompStore } from "@shared/realtime/stomp.store";

import { useStartCheckout } from "@features/performance-booking/model/use-start-checkout";

describe("useStartCheckout", () => {
  const reviewToken = "review-token";
  const publish = vi.fn();
  const unsubscribe = vi.fn();
  const subscribe = vi.fn();
  let handleMessage: ((message: StartCheckoutMessage) => void) | undefined;
  let handleError: ((message: StompFailureMessage) => void) | undefined;
  const stompClient = { publish, subscribe } as unknown as StompClient;

  beforeEach(() => {
    publish.mockReset();
    subscribe.mockReset();
    unsubscribe.mockReset();
    handleMessage = undefined;
    handleError = undefined;
    subscribe.mockImplementation(({ callback, errorCallback }) => {
      handleMessage = callback;
      handleError = errorCallback;
      return { unsubscribe };
    });
    useStompStore.setState({ stompClient, connectionStatus: "connected" });
  });

  afterEach(() => {
    act(() => {
      useStompStore.setState({ stompClient: null, connectionStatus: "disconnected" });
    });
    vi.useRealTimers();
  });

  it("공연 ID로 START_CHECKOUT을 전송하고 예약 ID를 전달한다", () => {
    const onSuccess = vi.fn();
    const { result } = renderHook(() => useStartCheckout({ performanceId: 10, reviewToken, onSuccess }));

    act(() => result.current.startCheckout());
    expect(result.current.isStarting).toBe(true);
    act(() => result.current.startCheckout());

    expect(publish).toHaveBeenCalledTimes(1);
    expect(publish).toHaveBeenCalledWith(
      expect.objectContaining({
        path: "/reservation/start-checkout",
        command: { requestId: expect.any(String), data: { performanceId: 10, reviewToken } },
      }),
    );
    const requestId = publish.mock.calls[0][0].command.requestId as string;
    act(() => {
      handleMessage?.({
        requestId,
        success: true,
        data: {
          reservationId: 501,
          orderId: "order-501",
          orderName: "Tikkle Live",
          amount: 150_000,
          paymentExpiresAt: "2026-09-15T13:00:00",
        },
      });
    });

    expect(result.current.isStarting).toBe(false);
    expect(onSuccess).toHaveBeenCalledWith(501);
  });

  it("결제 준비 실패 응답은 서버 오류 메시지를 표시한다", () => {
    const { result } = renderHook(() => useStartCheckout({ performanceId: 10, reviewToken, onSuccess: vi.fn() }));

    act(() => result.current.startCheckout());
    const requestId = publish.mock.calls[0][0].command.requestId as string;

    act(() => {
      handleError?.({
        requestId,
        success: false,
        error: { code: "CONFLICT", message: "좌석 점유가 만료되었습니다." },
      });
    });

    expect(result.current.isStarting).toBe(false);
    expect(result.current.errorMessage).toBe("좌석 점유가 만료되었습니다.");
  });

  it("예약 ID가 없는 성공 응답은 기본 오류로 처리한다", () => {
    const { result } = renderHook(() => useStartCheckout({ performanceId: 10, reviewToken, onSuccess: vi.fn() }));

    act(() => result.current.startCheckout());
    const requestId = publish.mock.calls[0][0].command.requestId as string;
    act(() => {
      handleMessage?.({
        requestId,
        success: true,
        data: {} as never,
      });
    });

    expect(result.current.errorMessage).toBe("결제 준비를 시작하지 못했습니다. 잠시 후 다시 시도해 주세요.");
  });

  it("성공 응답을 받으면 응답 타이머를 정리한다", () => {
    vi.useFakeTimers();

    const onSuccess = vi.fn();
    const clearTimeoutSpy = vi.spyOn(window, "clearTimeout");
    const { result } = renderHook(() => useStartCheckout({ performanceId: 10, reviewToken, onSuccess }));

    act(() => result.current.startCheckout());

    const requestId = publish.mock.calls[0][0].command.requestId as string;

    act(() => {
      handleMessage?.({
        requestId,
        success: true,
        data: {
          reservationId: 501,
          orderId: "order-501",
          orderName: "Tikkle Live",
          amount: 150_000,
          paymentExpiresAt: "2026-09-15T13:00:00",
        },
      });
    });

    expect(clearTimeoutSpy).toHaveBeenCalled();
    expect(onSuccess).toHaveBeenCalledWith(501);
  });

  it("오류 응답을 받으면 응답 타이머를 정리한다", () => {
    vi.useFakeTimers();

    const clearTimeoutSpy = vi.spyOn(window, "clearTimeout");
    const { result } = renderHook(() => useStartCheckout({ performanceId: 10, reviewToken, onSuccess: vi.fn() }));

    act(() => result.current.startCheckout());

    const requestId = publish.mock.calls[0][0].command.requestId as string;

    act(() => {
      handleError?.({
        requestId,
        success: false,
        error: { code: "CONFLICT", message: "점유가 만료되었습니다." },
      });
    });

    expect(clearTimeoutSpy).toHaveBeenCalled();
    expect(result.current.errorMessage).toBe("점유가 만료되었습니다.");
  });

  it("성공 응답 시 타이머 ID가 없으면 clearTimeout 없이 완료한다", () => {
    vi.spyOn(window, "setTimeout").mockReturnValue(null as unknown as number);
    const clearTimeoutSpy = vi.spyOn(window, "clearTimeout");
    const onSuccess = vi.fn();
    const { result } = renderHook(() => useStartCheckout({ performanceId: 10, reviewToken, onSuccess }));

    act(() => result.current.startCheckout());
    const requestId = publish.mock.calls[0][0].command.requestId as string;

    expect(handleMessage).toBeDefined();
    act(() => {
      handleMessage!({
        requestId,
        success: true,
        data: {
          reservationId: 501,
          orderId: "order-501",
          orderName: "Tikkle Live",
          amount: 150_000,
          paymentExpiresAt: "2026-09-15T13:00:00",
        },
      });
    });

    expect(clearTimeoutSpy).not.toHaveBeenCalled();
    expect(onSuccess).toHaveBeenCalledWith(501);
  });

  it("오류 응답 시 타이머 ID가 없으면 clearTimeout 없이 실패한다", () => {
    vi.spyOn(window, "setTimeout").mockReturnValue(null as unknown as number);
    const clearTimeoutSpy = vi.spyOn(window, "clearTimeout");
    const { result } = renderHook(() => useStartCheckout({ performanceId: 10, reviewToken, onSuccess: vi.fn() }));

    act(() => result.current.startCheckout());
    const requestId = publish.mock.calls[0][0].command.requestId as string;

    expect(handleError).toBeDefined();
    act(() => {
      handleError!({
        requestId,
        success: false,
        error: { code: "CONFLICT", message: "점유가 만료되었습니다." },
      });
    });

    expect(clearTimeoutSpy).not.toHaveBeenCalled();
    expect(result.current.errorMessage).toBe("점유가 만료되었습니다.");
  });

  it("이전 요청의 타임아웃 콜백은 현재 요청을 변경하지 않는다", () => {
    vi.useFakeTimers();

    vi.spyOn(window, "clearTimeout").mockImplementation(() => undefined);

    const { result } = renderHook(() => useStartCheckout({ performanceId: 10, reviewToken, onSuccess: vi.fn() }));

    act(() => result.current.startCheckout());

    const requestId = publish.mock.calls[0][0].command.requestId as string;

    act(() => {
      handleMessage?.({
        requestId,
        success: true,
        data: {
          reservationId: 501,
          orderId: "order-501",
          orderName: "Tikkle Live",
          amount: 150_000,
          paymentExpiresAt: "2026-09-15T13:00:00",
        },
      });
    });

    act(() => vi.advanceTimersByTime(8_000));

    expect(result.current.isStarting).toBe(false);
    expect(result.current.errorMessage).toBeNull();
  });

  it("다른 요청 응답은 무시한다", () => {
    const { result } = renderHook(() => useStartCheckout({ performanceId: 10, reviewToken, onSuccess: vi.fn() }));

    act(() => result.current.startCheckout());
    act(() => {
      handleMessage?.({
        requestId: "another-request",
        success: false,
        data: {} as never,
      });
    });

    expect(result.current.isStarting).toBe(true);
    expect(result.current.errorMessage).toBeNull();
  });

  it("다른 요청의 오류 응답도 무시한다", () => {
    const { result } = renderHook(() => useStartCheckout({ performanceId: 10, reviewToken, onSuccess: vi.fn() }));

    act(() => result.current.startCheckout());
    act(() => {
      handleError?.({
        requestId: "another-request",
        success: false,
        error: { code: "ERROR", message: "무시되어야 합니다." },
      });
    });

    expect(result.current.isStarting).toBe(true);
    expect(result.current.errorMessage).toBeNull();
  });

  it("응답을 잃으면 같은 START_CHECKOUT을 재전송하고 늦게 도착한 중복 응답은 무시한다", () => {
    vi.useFakeTimers();
    const onSuccess = vi.fn();
    const { result } = renderHook(() => useStartCheckout({ performanceId: 10, reviewToken, onSuccess }));

    act(() => result.current.startCheckout());
    const requestId = publish.mock.calls[0][0].command.requestId as string;
    act(() => vi.advanceTimersByTime(8_000));

    expect(publish).toHaveBeenCalledTimes(2);
    expect(publish.mock.calls[1][0].command).toEqual({ requestId, data: { performanceId: 10, reviewToken } });
    expect(result.current.isStarting).toBe(true);

    act(() => {
      handleMessage?.({
        requestId,
        success: true,
        data: {
          reservationId: 501,
          orderId: "order-501",
          orderName: "Tikkle Live",
          amount: 150_000,
          paymentExpiresAt: "2026-09-15T13:00:00",
        },
      });
      handleMessage?.({
        requestId,
        success: true,
        data: {
          reservationId: 501,
          orderId: "order-501",
          orderName: "Tikkle Live",
          amount: 150_000,
          paymentExpiresAt: "2026-09-15T13:00:00",
        },
      });
    });

    expect(result.current.isStarting).toBe(false);
    expect(onSuccess).toHaveBeenCalledTimes(1);
  });

  it("재전송 후에도 응답이 없으면 대기를 끝내고 다시 시도할 수 있다", () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useStartCheckout({ performanceId: 10, reviewToken, onSuccess: vi.fn() }));

    act(() => result.current.startCheckout());
    const firstRequestId = publish.mock.calls[0][0].command.requestId as string;
    act(() => vi.advanceTimersByTime(16_000));

    expect(publish).toHaveBeenCalledTimes(2);
    expect(result.current.isStarting).toBe(false);
    expect(result.current.errorMessage).toBe("결제 준비 결과를 확인하지 못했습니다. 다시 시도해 주세요.");

    act(() => result.current.startCheckout());

    expect(publish).toHaveBeenCalledTimes(3);
    expect(publish.mock.calls[2][0].command.requestId).not.toBe(firstRequestId);
    expect(result.current.isStarting).toBe(true);
    expect(result.current.errorMessage).toBeNull();
  });

  it("응답 대기 중 연결이 끊기면 무한 대기하지 않는다", () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useStartCheckout({ performanceId: 10, reviewToken, onSuccess: vi.fn() }));

    act(() => result.current.startCheckout());
    act(() => useStompStore.setState({ stompClient: null, connectionStatus: "disconnected" }));
    act(() => vi.advanceTimersByTime(8_000));

    expect(publish).toHaveBeenCalledTimes(1);
    expect(result.current.isStarting).toBe(false);
    expect(result.current.errorMessage).toBe("결제 준비 결과를 확인하지 못했습니다. 다시 시도해 주세요.");
  });

  it("STOMP가 연결되지 않았으면 요청 대신 연결 오류를 표시한다", () => {
    useStompStore.setState({ stompClient, connectionStatus: "disconnected" });
    const { result } = renderHook(() => useStartCheckout({ performanceId: 10, reviewToken, onSuccess: vi.fn() }));

    act(() => result.current.startCheckout());

    expect(publish).not.toHaveBeenCalled();
    expect(result.current.errorMessage).toBe("서버 연결 후 다시 시도해 주세요.");
  });

  it("비활성화된 checkout은 STOMP 요청을 보내지 않는다", () => {
    const onSuccess = vi.fn();
    const { result } = renderHook(() => useStartCheckout({ performanceId: 10, reviewToken, onSuccess, enabled: false }));

    act(() => result.current.startCheckout());

    expect(publish).not.toHaveBeenCalled();
    expect(onSuccess).not.toHaveBeenCalled();
    expect(result.current.isStarting).toBe(false);
  });
});
