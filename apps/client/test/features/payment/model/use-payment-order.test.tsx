import type { Client } from "@stomp/stompjs";
import { act, renderHook, waitFor } from "@testing-library/react";

import { useStompStore } from "@shared/realtime/stomp.store";

import { createPaymentOrderFixture } from "@features/payment/model/payment.fixtures";
import { usePaymentOrder } from "@features/payment/model/use-payment-order";

const subscription = vi.hoisted(() => ({ onMessage: null as ((message: { body: string }) => void) | null }));

vi.mock("@shared/realtime/use-stomp-subscription", () => ({
  useStompSubscription: ({ onMessage }: { onMessage: (message: { body: string }) => void }) => {
    subscription.onMessage = onMessage;
  },
}));

describe("usePaymentOrder", () => {
  const publish = vi.fn();
  const client = { connected: true, publish } as unknown as Client;

  beforeEach(() => {
    publish.mockReset();
    subscription.onMessage = null;
    useStompStore.setState({ client, connectionStatus: "connected" });
  });

  afterEach(() => {
    useStompStore.setState({ client: null, connectionStatus: "disconnected" });
  });

  it("예약 번호가 바뀌면 이전 주문을 비우고 새 주문을 조회한다", async () => {
    const { result, rerender } = renderHook(({ reservationId }) => usePaymentOrder(reservationId), {
      initialProps: { reservationId: 501 },
    });

    await waitFor(() => expect(publish).toHaveBeenCalledTimes(1));
    const firstRequest = JSON.parse(publish.mock.calls[0][0].body) as { requestId: string };

    act(() => {
      subscription.onMessage?.({
        body: JSON.stringify({
          requestId: firstRequest.requestId,
          action: "GET_PAYMENT_ORDER",
          success: true,
          data: createPaymentOrderFixture(501),
        }),
      });
    });
    expect(result.current.order?.reservationId).toBe(501);

    rerender({ reservationId: 502 });

    expect(result.current.order).toBeNull();
    expect(result.current.isLoading).toBe(true);
    await waitFor(() => expect(publish).toHaveBeenCalledTimes(2));
  });

  it("예약 번호가 올바르지 않으면 주문 조회를 중단한다", () => {
    const { result } = renderHook(() => usePaymentOrder(0));

    expect(result.current).toMatchObject({
      order: null,
      errorMessage: "올바르지 않은 결제 주문입니다.",
      isLoading: false,
    });
    expect(publish).not.toHaveBeenCalled();
  });

  it("fixture 모드에서는 STOMP 요청 없이 주문서를 제공한다", async () => {
    const { result } = renderHook(() => usePaymentOrder(501, true));

    await waitFor(() => expect(result.current.order?.reservationId).toBe(501));
    expect(result.current.isFixture).toBe(true);
    expect(result.current.isLoading).toBe(false);
    expect(publish).not.toHaveBeenCalled();
  });

  it("주문 조회 실패 응답은 서버 오류 메시지를 표시한다", async () => {
    const { result } = renderHook(() => usePaymentOrder(501));

    await waitFor(() => expect(publish).toHaveBeenCalledTimes(1));
    const requestId = JSON.parse(publish.mock.calls[0][0].body).requestId as string;

    act(() => {
      subscription.onMessage?.({
        body: JSON.stringify({
          requestId,
          action: "GET_PAYMENT_ORDER",
          success: false,
          error: { code: "NOT_FOUND", message: "주문서를 찾을 수 없습니다." },
        }),
      });
    });

    expect(result.current.errorMessage).toBe("주문서를 찾을 수 없습니다.");
    expect(result.current.isLoading).toBe(false);
  });

  it("오류 메시지가 없는 실패 응답은 기본 메시지를 표시한다", async () => {
    const { result } = renderHook(() => usePaymentOrder(501));

    await waitFor(() => expect(publish).toHaveBeenCalledTimes(1));
    const requestId = JSON.parse(publish.mock.calls[0][0].body).requestId as string;

    act(() => {
      subscription.onMessage?.({
        body: JSON.stringify({ requestId, action: "GET_PAYMENT_ORDER", success: false }),
      });
    });

    expect(result.current.errorMessage).toBe("결제 주문서를 불러오지 못했습니다.");
  });

  it("주문서 형식이 올바르지 않은 성공 응답은 오류로 처리한다", async () => {
    const { result } = renderHook(() => usePaymentOrder(501));

    await waitFor(() => expect(publish).toHaveBeenCalledTimes(1));
    const requestId = JSON.parse(publish.mock.calls[0][0].body).requestId as string;

    act(() => {
      subscription.onMessage?.({
        body: JSON.stringify({ requestId, action: "GET_PAYMENT_ORDER", success: true, data: {} }),
      });
    });

    expect(result.current.errorMessage).toBe("결제 주문서 형식이 올바르지 않습니다.");
    expect(result.current.isLoading).toBe(false);
  });

  it("현재 요청과 일치하지 않는 응답은 무시한다", async () => {
    const { result } = renderHook(() => usePaymentOrder(501));

    await waitFor(() => expect(publish).toHaveBeenCalledTimes(1));

    act(() => {
      subscription.onMessage?.({
        body: JSON.stringify({
          requestId: "another-request",
          action: "GET_PAYMENT_ORDER",
          success: false,
          error: { code: "ERROR", message: "무시되어야 합니다." },
        }),
      });
    });

    expect(result.current.errorMessage).toBeNull();
    expect(result.current.isLoading).toBe(true);
  });
});
