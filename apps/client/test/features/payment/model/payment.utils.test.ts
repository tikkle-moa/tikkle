import { formatPaymentAmount, getPaymentCustomerKey, isPaymentOrder, parsePaymentCommandResponse } from "@features/payment/model/payment.utils";

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

  it("금액과 STOMP 응답을 표시용 형식으로 처리한다", () => {
    expect(formatPaymentAmount(132_000)).toBe("132,000원");
    expect(parsePaymentCommandResponse('{"requestId":"id","action":"GET_PAYMENT_ORDER","success":true,"data":{}}')).toMatchObject({
      requestId: "id",
      success: true,
    });
    expect(parsePaymentCommandResponse("not-json")).toBeNull();
    expect(parsePaymentCommandResponse('{"requestId":1}')).toBeNull();
  });

  it("결제 주문 응답의 필수 필드를 검증한다", () => {
    const order = {
      reservationId: 1,
      orderId: "tikkle-order",
      orderName: "콘서트 1석",
      amount: 66_000,
      paymentExpiresAt: "2027-01-20T19:05:00",
      concertTitle: "콘서트",
      performanceName: "1회차",
      performanceStartsAt: "2027-01-20T19:00:00",
      venueName: "티클홀",
      seats: [{ venueSeatId: 1, sectionName: "R석", seatLabel: "A-1", price: 66_000 }],
    };

    expect(isPaymentOrder(order)).toBe(true);
    expect(isPaymentOrder({ ...order, seats: [{ ...order.seats[0], price: "66000" }] })).toBe(false);
    expect(isPaymentOrder(null)).toBe(false);
  });
});
