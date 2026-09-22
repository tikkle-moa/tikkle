import {
  formatBookingAmount,
  getRemainingSeconds,
  isPerformanceCheckoutLocationState,
  isStartCheckoutData,
  parseBookingMessage,
} from "@features/performance-booking/model/performance-booking.utils";

const performance = { id: 10, venueId: 1, name: "Tikkle Live", startsAt: "2026-09-01T19:00:00" };
const venue = { id: 1, name: "티끌홀" };
const venueSeats = [{ id: 101, sectionName: "A구역", seatLabel: "1번", price: 150_000 }];
const hold = { holdId: "hold-1", groupId: "group-1", performanceId: 10, venueSeatIds: [101], expiresAt: "2026-09-16T20:00:00" };

describe("performance-booking.utils", () => {
  it("금액과 점유 남은 시간을 포맷한다", () => {
    expect(formatBookingAmount(150_000)).toBe("150,000원");
    expect(getRemainingSeconds("2026-09-15T13:00:05.001Z", Date.parse("2026-09-15T13:00:00.000Z"))).toBe(6);
    expect(getRemainingSeconds("2026-09-15T12:59:59.000Z", Date.parse("2026-09-15T13:00:00.000Z"))).toBe(0);
    expect(getRemainingSeconds("invalid-date", Date.parse("2026-09-15T13:00:00.000Z"))).toBe(0);
  });

  it("예매 STOMP 응답을 검증하고 파싱한다", () => {
    const valid = parseBookingMessage(JSON.stringify({ requestId: "req-1", success: true, data: {} }));
    expect(valid).toMatchObject({ requestId: "req-1", success: true });
    expect(parseBookingMessage("not-json")).toBeNull();
    expect(parseBookingMessage("null")).toBeNull();
    expect(parseBookingMessage(JSON.stringify({ requestId: "req-1" }))).toBeNull();
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
    expect(isStartCheckoutData(null)).toBe(false);
    expect(isStartCheckoutData({ ...value, reservationId: "101" })).toBe(false);
    expect(isStartCheckoutData({ ...value, orderId: 101 })).toBe(false);
    expect(isStartCheckoutData({ ...value, orderName: 101 })).toBe(false);
    expect(isStartCheckoutData({ ...value, amount: "150000" })).toBe(false);
    expect(isStartCheckoutData({ ...value, paymentExpiresAt: 101 })).toBe(false);
  });

  it("예매 정보 확인 상태의 공연·공연장·좌석 점유 계약을 검증한다", () => {
    const state = { performance, venue, venueSeats, hold };

    expect(isPerformanceCheckoutLocationState(state, 10)).toBe(true);
    expect(isPerformanceCheckoutLocationState(null, 10)).toBe(false);
    expect(isPerformanceCheckoutLocationState({ ...state, performance: null }, 10)).toBe(false);
    expect(isPerformanceCheckoutLocationState({ ...state, venue: null }, 10)).toBe(false);
    expect(isPerformanceCheckoutLocationState({ ...state, venueSeats: [null] }, 10)).toBe(false);
    expect(isPerformanceCheckoutLocationState({ ...state, hold: null }, 10)).toBe(false);
    expect(isPerformanceCheckoutLocationState({ ...state, hold: { ...hold, performanceId: 11 } }, 10)).toBe(false);
    expect(isPerformanceCheckoutLocationState({ ...state, venueSeats: [] }, 10)).toBe(false);
    expect(isPerformanceCheckoutLocationState({ ...state, hold: { ...hold, venueSeatIds: [999] } }, 10)).toBe(false);
    expect(isPerformanceCheckoutLocationState(state, 11)).toBe(false);
  });
});
