import { act, renderHook, waitFor } from "@testing-library/react";
import type { StompFailureMessage } from "@tikkle/api-types";

import type StompClient from "@shared/realtime/stomp-client";
import { useStompStore } from "@shared/realtime/stomp.store";

import { usePaymentResult } from "@features/payment/model/use-payment-result";

describe("usePaymentResult", () => {
  const publish = vi.fn();
  const subscribe = vi.fn();
  const unsubscribe = vi.fn();
  let handleMessage: ((message: { requestId: string }) => void) | undefined;
  let handleError: ((message: StompFailureMessage) => void) | undefined;

  const firstClient = { publish, subscribe } as unknown as StompClient;
  const secondClient = { publish, subscribe } as unknown as StompClient;
  const request = {
    action: "CANCEL_PAYMENT" as const,
    data: { reservationId: 501 },
  };

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
    useStompStore.setState({ stompClient: firstClient, connectionStatus: "connected" });
  });

  afterEach(() => {
    act(() => {
      useStompStore.setState({ stompClient: null, connectionStatus: "disconnected" });
    });
  });

  it("요청이 없으면 결제 결과 명령을 전송하지 않는다", () => {
    const { result } = renderHook(() => usePaymentResult({ request: null }));

    expect(result.current).toEqual({ errorMessage: null, status: "pending" });
    expect(publish).not.toHaveBeenCalled();
    expect(subscribe).not.toHaveBeenCalled();
  });

  it("취소 성공 후 STOMP가 재연결되어도 취소 명령을 중복 전송하지 않는다", async () => {
    const { result } = renderHook(() => usePaymentResult({ request }));

    await waitFor(() => expect(publish).toHaveBeenCalledTimes(1));
    const requestId = publish.mock.calls[0][0].command.requestId as string;

    act(() => handleMessage?.({ requestId }));
    expect(result.current.status).toBe("succeeded");

    act(() => {
      useStompStore.setState({ stompClient: secondClient, connectionStatus: "connected" });
    });

    expect(publish).toHaveBeenCalledTimes(1);
    expect(subscribe).toHaveBeenCalledTimes(2);
  });

  it("응답을 받기 전에 STOMP가 재연결되어도 처리 중인 명령을 중복 전송하지 않는다", async () => {
    const { result } = renderHook(() => usePaymentResult({ request }));

    await waitFor(() => expect(publish).toHaveBeenCalledTimes(1));

    act(() => {
      useStompStore.setState({ stompClient: secondClient, connectionStatus: "connected" });
    });

    expect(result.current.status).toBe("pending");
    expect(publish).toHaveBeenCalledTimes(1);
    expect(subscribe).toHaveBeenCalledTimes(2);
  });

  it("결제 처리 실패 응답은 서버 오류 메시지와 실패 상태를 표시한다", async () => {
    const { result } = renderHook(() => usePaymentResult({ request }));

    await waitFor(() => expect(publish).toHaveBeenCalledTimes(1));
    const requestId = publish.mock.calls[0][0].command.requestId as string;

    act(() => {
      handleError?.({
        requestId,
        success: false,
        error: { code: "PAYMENT_ERROR", message: "결제를 취소할 수 없습니다." },
      });
    });

    expect(result.current).toEqual({ errorMessage: "결제를 취소할 수 없습니다.", status: "failed" });
  });

  it("새 결제 요청으로 바뀌면 이전 실패 상태를 초기화하고 다시 전송한다", async () => {
    const nextRequest = { action: "CANCEL_PAYMENT" as const, data: { reservationId: 502 } };
    const { result, rerender } = renderHook(({ currentRequest }) => usePaymentResult({ request: currentRequest }), {
      initialProps: { currentRequest: request },
    });

    await waitFor(() => expect(publish).toHaveBeenCalledTimes(1));
    const firstRequestId = publish.mock.calls[0][0].command.requestId as string;

    act(() => {
      handleError?.({
        requestId: firstRequestId,
        success: false,
        error: { code: "PAYMENT_ERROR", message: "첫 요청 실패" },
      });
    });
    expect(result.current.status).toBe("failed");

    rerender({ currentRequest: nextRequest });

    expect(result.current).toEqual({ errorMessage: null, status: "pending" });
    await waitFor(() => expect(publish).toHaveBeenCalledTimes(2));
    expect(publish.mock.calls[1][0].command.data.reservationId).toBe(502);
  });

  it("결제 승인 요청은 승인 경로로 구독하고 전송한다", async () => {
    const confirmRequest = {
      action: "CONFIRM_PAYMENT" as const,
      data: { paymentKey: "payment-key", orderId: "order-id", amount: 15000 },
    };

    renderHook(() => usePaymentResult({ request: confirmRequest }));

    await waitFor(() => expect(publish).toHaveBeenCalledOnce());
    expect(subscribe).toHaveBeenCalledWith(expect.objectContaining({ path: "/reservation/confirm-payment" }));
    expect(publish).toHaveBeenCalledWith(
      expect.objectContaining({
        path: "/reservation/confirm-payment",
        command: expect.objectContaining({ data: confirmRequest.data }),
      }),
    );
  });

  it("현재 요청과 일치하지 않는 응답은 무시한다", async () => {
    const { result } = renderHook(() => usePaymentResult({ request }));

    await waitFor(() => expect(publish).toHaveBeenCalledTimes(1));

    act(() => {
      handleMessage?.({ requestId: "another-request" });
      handleError?.({
        requestId: "another-request",
        success: false,
        error: { code: "ERROR", message: "무시되어야 합니다." },
      });
    });

    expect(result.current).toEqual({ errorMessage: null, status: "pending" });
  });
});
