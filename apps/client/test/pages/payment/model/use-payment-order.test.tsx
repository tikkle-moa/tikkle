import { act, renderHook, waitFor } from "@testing-library/react";
import type { PaymentOrderMessage, PaymentOrderMessageData, StompFailureMessage } from "@tikkle/api-types";

import type StompClient from "@shared/realtime/stomp-client";
import { useStompStore } from "@shared/realtime/stomp.store";

import { usePaymentOrder } from "@pages/payment/model/use-payment-order";

describe("usePaymentOrder", () => {
  const publish = vi.fn();
  const unsubscribe = vi.fn();
  const subscribe = vi.fn();
  let handleMessage: ((message: PaymentOrderMessage) => void) | undefined;
  let handleError: ((message: StompFailureMessage) => void) | undefined;

  const stompClient = { publish, subscribe } as unknown as StompClient;
  const createPaymentOrderMessageData = (reservationId: number): PaymentOrderMessageData => ({
    reservationId,
    orderId: `tikkle-${reservationId}`,
    orderName: "Tikkle Live 2석",
    amount: 300_000,
    paymentExpiresAt: "2026-09-15T13:30:00.000Z",
    concertTitle: "Tikkle Live",
    posterUrl: null,
    performanceName: "Tikkle Live 1회차",
    performanceStartsAt: "2026-09-01T19:00:00",
    venueName: "올림픽공원 KSPO DOME",
    seats: [],
  });

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
  });

  it("예약 번호가 바뀌면 이전 주문을 비우고 새 주문을 조회한다", async () => {
    const { result, rerender } = renderHook(({ reservationId }) => usePaymentOrder({ reservationId }), {
      initialProps: { reservationId: 501 },
    });

    await waitFor(() => expect(publish).toHaveBeenCalledTimes(1));
    const firstRequestId = publish.mock.calls[0][0].command.requestId as string;

    act(() => {
      handleMessage?.({
        requestId: firstRequestId,
        success: true,
        data: createPaymentOrderMessageData(501),
      });
    });
    expect(result.current.order?.reservationId).toBe(501);

    rerender({ reservationId: 502 });

    expect(result.current.order).toBeNull();
    expect(result.current.isLoading).toBe(true);
    await waitFor(() => expect(publish).toHaveBeenCalledTimes(2));
    expect(unsubscribe).toHaveBeenCalledOnce();
  });

  it("예약 번호가 올바르지 않으면 주문 조회를 중단한다", () => {
    const { result } = renderHook(() => usePaymentOrder({ reservationId: 0 }));

    expect(result.current).toMatchObject({
      order: null,
      errorMessage: "올바르지 않은 결제 주문입니다.",
      isLoading: false,
    });
    expect(publish).not.toHaveBeenCalled();
    expect(subscribe).not.toHaveBeenCalled();
  });

  it("초기 주문서가 있으면 STOMP 요청 없이 주문서를 제공한다", () => {
    const initialOrder = createPaymentOrderMessageData(501);
    const { result } = renderHook(() => usePaymentOrder({ reservationId: 501, initialOrder }));

    expect(result.current.order).toEqual(initialOrder);
    expect(result.current.isLoading).toBe(false);
    expect(publish).not.toHaveBeenCalled();
  });

  it("주문 조회 실패 응답은 서버 오류 메시지를 표시한다", async () => {
    const { result } = renderHook(() => usePaymentOrder({ reservationId: 501 }));

    await waitFor(() => expect(publish).toHaveBeenCalledTimes(1));
    const requestId = publish.mock.calls[0][0].command.requestId as string;

    act(() => {
      handleError?.({
        requestId,
        success: false,
        error: { code: "NOT_FOUND", message: "주문서를 찾을 수 없습니다." },
      });
    });

    expect(result.current.errorMessage).toBe("주문서를 찾을 수 없습니다.");
    expect(result.current.isLoading).toBe(false);
  });

  it("오류 메시지가 없는 주문 조회 실패는 기본 문구를 표시한다", async () => {
    const { result } = renderHook(() => usePaymentOrder({ reservationId: 501 }));

    await waitFor(() => expect(publish).toHaveBeenCalledTimes(1));
    const requestId = publish.mock.calls[0][0].command.requestId as string;

    act(() => {
      handleError?.({ requestId, success: false, error: { code: "ERROR" } as never });
    });

    expect(result.current.errorMessage).toBe("결제 주문서를 불러오지 못했습니다.");
    expect(result.current.isLoading).toBe(false);
  });

  it("현재 요청과 일치하지 않는 응답은 무시한다", async () => {
    const { result } = renderHook(() => usePaymentOrder({ reservationId: 501 }));

    await waitFor(() => expect(publish).toHaveBeenCalledTimes(1));

    act(() => {
      handleMessage?.({
        requestId: "another-request",
        success: true,
        data: createPaymentOrderMessageData(501),
      });
      handleError?.({
        requestId: "another-request",
        success: false,
        error: { code: "ERROR", message: "무시되어야 합니다." },
      });
    });

    expect(result.current.errorMessage).toBeNull();
    expect(result.current.isLoading).toBe(true);
  });
});
