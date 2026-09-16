import { createPerformanceCheckoutFixture } from "@pages/performance-checkout/model/performance-checkout.fixtures";

describe("performance-checkout.fixtures", () => {
  it("예매 정보 확인부터 결제 위젯까지 연결할 fixture를 만든다", () => {
    const fixture = createPerformanceCheckoutFixture();

    expect(fixture).toMatchObject({
      performance: { id: 10, venueId: 1 },
      venue: { id: 1 },
      selectedSeatIds: [101, 102],
      paymentOrder: {
        reservationId: 501,
        orderId: "tikkle-fixture-501",
      },
    });
    expect(fixture.venueSeats).toHaveLength(2);
    expect(fixture.paymentOrder.seats).toHaveLength(2);
    expect(fixture.paymentOrder.seats.reduce((total, seat) => total + seat.price, 0)).toBe(fixture.paymentOrder.amount);
  });
});
