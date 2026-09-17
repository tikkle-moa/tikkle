import { act, renderHook } from "@testing-library/react";

import { useTossPaymentWidget } from "@features/payment/model/use-toss-payment-widget";

const order = {
  reservationId: 1,
  orderId: "order",
  orderName: "공연 1석",
  amount: 10000,
  paymentExpiresAt: "2020-01-01T00:00:00",
} as never;
const user = { id: 1, email: "user@example.com", nickname: "사용자" } as never;

describe("useTossPaymentWidget guard", () => {
  it("위젯이 없거나 결제 시간이 만료되면 결제 요청을 건너뛴다", async () => {
    vi.stubEnv("VITE_TOSS_CLIENT_KEY", "");
    const { result } = renderHook(() => useTossPaymentWidget({ order, user }));

    await act(async () => result.current.handlePaymentRequest());

    expect(result.current.isRequesting).toBe(false);
    vi.unstubAllEnvs();
  });
});
