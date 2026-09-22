import { getPaymentCustomerKey, isPaymentOrder } from "@features/payment/model/payment.utils";

describe("payment.utils", () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.stubGlobal("crypto", { randomUUID: vi.fn(() => "0e9855c5-99ae-4ef2-a118-9042a8d785f2") });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("고객 키는 사용자별로 sessionStorage에 보관하고 재사용한다", () => {
    expect(getPaymentCustomerKey(1)).toBe("tikkle_0e9855c5-99ae-4ef2-a118-9042a8d785f2");
    expect(getPaymentCustomerKey(1)).toBe("tikkle_0e9855c5-99ae-4ef2-a118-9042a8d785f2");
    expect(getPaymentCustomerKey(2)).toBe("tikkle_0e9855c5-99ae-4ef2-a118-9042a8d785f2");
    expect(crypto.randomUUID).toHaveBeenCalledTimes(2);
  });

  it("결제 주문서의 필수 필드와 좌석 정보를 검증한다", () => {
    const order = {
      reservationId: 501,
      orderId: "tikkle-501",
      orderName: "Tikkle Live 2석",
      amount: 300_000,
      paymentExpiresAt: "2026-09-15T13:30:00.000Z",
      concertTitle: "Tikkle Live",
      posterUrl: null,
      performanceName: "Tikkle Live 1회차",
      performanceStartsAt: "2026-09-01T19:00:00",
      venueName: "티끌홀",
      seats: [{ venueSeatId: 101, sectionName: "A구역", seatLabel: "A구역 1번", price: 150_000 }],
    };

    expect(isPaymentOrder(order)).toBe(true);
    expect(isPaymentOrder(null)).toBe(false);
    expect(isPaymentOrder({ ...order, posterUrl: 101 })).toBe(false);
    expect(isPaymentOrder({ ...order, seats: [null] })).toBe(false);
    expect(isPaymentOrder({ ...order, seats: [{ ...order.seats[0], price: "150000" }] })).toBe(false);
  });
});
