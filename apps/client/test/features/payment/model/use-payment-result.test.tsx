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
});
