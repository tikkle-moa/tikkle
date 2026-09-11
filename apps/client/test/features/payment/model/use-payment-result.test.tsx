import type { Client } from "@stomp/stompjs";
import { act, renderHook, waitFor } from "@testing-library/react";

import { useStompStore } from "@shared/realtime/stomp.store";

import { usePaymentResult } from "@features/payment/model/use-payment-result";

const subscription = vi.hoisted(() => ({ onMessage: null as ((message: { body: string }) => void) | null }));

vi.mock("@shared/realtime/use-stomp-subscription", () => ({
  useStompSubscription: ({ onMessage }: { onMessage: (message: { body: string }) => void }) => {
    subscription.onMessage = onMessage;
  },
}));

describe("usePaymentResult", () => {
  const publish = vi.fn();
  const firstClient = { connected: true, publish } as unknown as Client;
  const secondClient = { connected: true, publish } as unknown as Client;
  const request = {
    action: "CANCEL_PAYMENT" as const,
    data: { reservationId: 501 },
  };

  beforeEach(() => {
    publish.mockReset();
    subscription.onMessage = null;
    useStompStore.setState({ client: firstClient, connectionStatus: "connected" });
  });

  afterEach(() => {
    useStompStore.setState({ client: null, connectionStatus: "disconnected" });
  });

  it("취소 성공 후 STOMP가 재연결되어도 취소 명령을 중복 전송하지 않는다", async () => {
    const { result } = renderHook(() => usePaymentResult(request));

    await waitFor(() => expect(publish).toHaveBeenCalledTimes(1));
    const firstRequest = JSON.parse(publish.mock.calls[0][0].body) as { requestId: string };

    act(() => {
      subscription.onMessage?.({
        body: JSON.stringify({
          requestId: firstRequest.requestId,
          action: "CANCEL_PAYMENT",
          success: true,
          data: { reservationId: 501, status: "CANCELLED" },
        }),
      });
    });
    expect(result.current.status).toBe("succeeded");

    act(() => {
      useStompStore.setState({ client: secondClient, connectionStatus: "connected" });
    });

    await waitFor(() => expect(result.current.status).toBe("succeeded"));
    expect(publish).toHaveBeenCalledTimes(1);
  });

  it("결제 처리 실패 응답은 서버 오류 메시지와 실패 상태를 표시한다", async () => {
    const { result } = renderHook(() => usePaymentResult(request));

    await waitFor(() => expect(publish).toHaveBeenCalledTimes(1));
    const requestId = JSON.parse(publish.mock.calls[0][0].body).requestId as string;

    act(() => {
      subscription.onMessage?.({
        body: JSON.stringify({
          requestId,
          action: "CANCEL_PAYMENT",
          success: false,
          error: { code: "PAYMENT_ERROR", message: "결제를 취소할 수 없습니다." },
        }),
      });
    });

    expect(result.current).toEqual({ errorMessage: "결제를 취소할 수 없습니다.", status: "failed" });
  });

  it("오류 메시지가 없는 실패 응답은 기본 메시지를 표시한다", async () => {
    const { result } = renderHook(() => usePaymentResult(request));

    await waitFor(() => expect(publish).toHaveBeenCalledTimes(1));
    const requestId = JSON.parse(publish.mock.calls[0][0].body).requestId as string;

    act(() => {
      subscription.onMessage?.({
        body: JSON.stringify({ requestId, action: "CANCEL_PAYMENT", success: false }),
      });
    });

    expect(result.current.errorMessage).toBe("결제 처리 결과를 확인하지 못했습니다.");
    expect(result.current.status).toBe("failed");
  });

  it("새 결제 요청으로 바뀌면 이전 실패 상태를 초기화하고 다시 전송한다", async () => {
    const nextRequest = { action: "CANCEL_PAYMENT" as const, data: { reservationId: 502 } };
    const { result, rerender } = renderHook(({ currentRequest }) => usePaymentResult(currentRequest), {
      initialProps: { currentRequest: request },
    });

    await waitFor(() => expect(publish).toHaveBeenCalledTimes(1));
    const firstRequestId = JSON.parse(publish.mock.calls[0][0].body).requestId as string;

    act(() => {
      subscription.onMessage?.({
        body: JSON.stringify({
          requestId: firstRequestId,
          action: "CANCEL_PAYMENT",
          success: false,
          error: { code: "PAYMENT_ERROR", message: "첫 요청 실패" },
        }),
      });
    });
    expect(result.current.status).toBe("failed");

    rerender({ currentRequest: nextRequest });

    expect(result.current).toEqual({ errorMessage: null, status: "pending" });
    await waitFor(() => expect(publish).toHaveBeenCalledTimes(2));
    expect(JSON.parse(publish.mock.calls[1][0].body).data.reservationId).toBe(502);
  });

  it("현재 요청과 일치하지 않는 응답은 무시한다", async () => {
    const { result } = renderHook(() => usePaymentResult(request));

    await waitFor(() => expect(publish).toHaveBeenCalledTimes(1));

    act(() => {
      subscription.onMessage?.({ body: "not-json" });
    });

    expect(result.current).toEqual({ errorMessage: null, status: "pending" });
  });
});
