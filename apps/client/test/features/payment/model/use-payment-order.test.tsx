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
});
