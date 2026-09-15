import {
  formatBookingAmount,
  getRemainingSeconds,
  isStartCheckoutData,
  parseBookingCommandResponse,
} from "@features/performance-booking/model/performance-booking.utils";

describe("performance-booking.utils", () => {
  it("금액과 점유 남은 시간을 포맷한다", () => {
    expect(formatBookingAmount(150_000)).toBe("150,000원");
    expect(getRemainingSeconds("2026-09-15T13:00:05.001Z", Date.parse("2026-09-15T13:00:00.000Z"))).toBe(6);
    expect(getRemainingSeconds("2026-09-15T12:59:59.000Z", Date.parse("2026-09-15T13:00:00.000Z"))).toBe(0);
    expect(getRemainingSeconds("invalid-date", Date.parse("2026-09-15T13:00:00.000Z"))).toBe(0);
  });

  it("예매 STOMP 응답을 검증하고 파싱한다", () => {
    const valid = parseBookingCommandResponse(JSON.stringify({ requestId: "req-1", success: true, data: {} }));
    expect(valid).toMatchObject({ requestId: "req-1", success: true });
    expect(parseBookingCommandResponse("not-json")).toBeNull();
    expect(parseBookingCommandResponse("null")).toBeNull();
    expect(parseBookingCommandResponse(JSON.stringify({ requestId: "req-1" }))).toBeNull();
  });

  it("START_CHECKOUT 응답 데이터를 생성 계약대로 검증한다", () => {
    const value = {
      reservationId: 101,
      orderId: "order-101",
      orderName: "Tikkle Live",
      amount: 150_000,
      paymentExpiresAt: "2026-09-15T13:00:00",
    };

    expect(isStartCheckoutData(value)).toBe(true);
    expect(isStartCheckoutData({ ...value, reservationId: "101" })).toBe(false);
    expect(isStartCheckoutData({ ...value, orderId: 101 })).toBe(false);
    expect(isStartCheckoutData({ ...value, orderName: 101 })).toBe(false);
    expect(isStartCheckoutData({ ...value, amount: "150000" })).toBe(false);
    expect(isStartCheckoutData({ ...value, paymentExpiresAt: 101 })).toBe(false);
  });
});
