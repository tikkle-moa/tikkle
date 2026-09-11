import { createPaymentCheckoutFixture, createPaymentOrderFixture } from "@features/payment/model/payment.fixtures";

describe("payment.fixtures", () => {
  it("PAYMENT_PENDING 결제 준비 결과를 만든다", () => {
    expect(createPaymentCheckoutFixture()).toMatchObject({
      reservationId: 501,
      holdId: "fixture-hold-501",
      orderId: "tikkle-fixture-501",
      status: "PAYMENT_PENDING",
    });
  });

  it("예약 번호를 포함한 결제 주문서 미리보기를 만든다", () => {
    const order = createPaymentOrderFixture(501);

    expect(order).toMatchObject({
      reservationId: 501,
      orderId: "tikkle-fixture-501",
      amount: 300_000,
      concertTitle: "2026 Summer Festival",
      posterUrl: "https://picsum.photos/seed/concert1/400/600",
    });
    expect(order.seats).toHaveLength(2);
    expect(order.seats.reduce((total, seat) => total + seat.price, 0)).toBe(order.amount);
    expect(new Date(order.paymentExpiresAt).getTime()).toBeGreaterThan(Date.now());
  });
});
