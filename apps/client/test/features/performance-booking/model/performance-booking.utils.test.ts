import {
  clearPerformanceCheckoutReviewToken,
  clearPerformanceSeatSelectionSession,
  createPerformanceSeatSelectionSession,
  formatBookingAmount,
  getOrCreatePerformanceCheckoutReviewToken,
  getOrCreatePerformanceSeatSelectionSession,
  getPerformanceSeatSessionStorageKey,
  getRemainingSeconds,
  isPerformanceCheckoutLocationState,
} from "@features/performance-booking/model/performance-booking.utils";

const performance = { id: 10, venueId: 1, name: "Tikkle Live", startsAt: "2026-09-01T19:00:00" };
const venue = { id: 1, name: "티끌홀" };
const venueSeats = [{ id: 101, sectionName: "A구역", seatLabel: "1번", price: 150_000 }];
const review = {
  reviewToken: "review-1",
  groupId: "group-1",
  sessionId: "session-1",
  performanceId: 10,
  venueSeatIds: [101],
  expiresAt: "2026-09-16T20:00:00",
};

describe("performance-booking.utils", () => {
  it("공연별 좌석 선택 세션 키를 생성하고 삭제한다", () => {
    const key = getPerformanceSeatSessionStorageKey(10);
    sessionStorage.setItem(key, "session-1");

    clearPerformanceSeatSelectionSession(10);

    expect(sessionStorage.getItem(key)).toBeNull();
  });

  it("브라우저 전역이 없으면 좌석 선택 세션 삭제를 건너뛴다", () => {
    vi.stubGlobal("window", undefined);

    expect(() => clearPerformanceSeatSelectionSession(10)).not.toThrow();

    vi.unstubAllGlobals();
  });

  it("브라우저 전역이 없으면 예매 확인 토큰 삭제를 건너뛴다", () => {
    vi.stubGlobal("window", undefined);

    expect(() => clearPerformanceCheckoutReviewToken(10, "session-10", "review-10")).not.toThrow();

    vi.unstubAllGlobals();
  });

  it("공연별 새 좌석 선택 세션을 생성하고 저장한다", () => {
    const sessionId = createPerformanceSeatSelectionSession(10);

    expect(sessionId).toEqual(expect.any(String));
    expect(sessionStorage.getItem(getPerformanceSeatSessionStorageKey(10))).toBe(sessionId);
  });

  it("좌석 선택 세션과 예매 확인 토큰을 저장된 값에서 재사용한다", () => {
    sessionStorage.setItem(getPerformanceSeatSessionStorageKey(11), "session-11");

    const sessionId = getOrCreatePerformanceSeatSelectionSession(11);
    const reviewToken = getOrCreatePerformanceCheckoutReviewToken(11, sessionId);

    expect(sessionId).toBe("session-11");
    expect(getOrCreatePerformanceSeatSelectionSession(11)).toBe(sessionId);
    expect(getOrCreatePerformanceCheckoutReviewToken(11, sessionId)).toBe(reviewToken);
    expect(getOrCreatePerformanceCheckoutReviewToken(12, sessionId)).not.toBe(reviewToken);
  });

  it("좌석 선택 세션을 정리할 때 해당 세션의 예매 확인 토큰도 삭제한다", () => {
    const sessionId = getOrCreatePerformanceSeatSelectionSession(13);
    const reviewToken = getOrCreatePerformanceCheckoutReviewToken(13, sessionId);

    clearPerformanceSeatSelectionSession(13);

    expect(sessionStorage.getItem(getPerformanceSeatSessionStorageKey(13))).toBeNull();
    expect(getOrCreatePerformanceCheckoutReviewToken(13, sessionId)).not.toBe(reviewToken);
  });

  it("현재 세션의 예매 확인 토큰만 삭제한다", () => {
    const sessionId = "session-14";
    const reviewToken = getOrCreatePerformanceCheckoutReviewToken(14, sessionId);

    clearPerformanceCheckoutReviewToken(14, sessionId, "another-review-token");
    expect(getOrCreatePerformanceCheckoutReviewToken(14, sessionId)).toBe(reviewToken);

    clearPerformanceCheckoutReviewToken(14, sessionId, reviewToken);
    expect(getOrCreatePerformanceCheckoutReviewToken(14, sessionId)).not.toBe(reviewToken);
  });

  it("좌석 선택 세션이 없으면 예매 확인 토큰 삭제를 건너뛴다", () => {
    clearPerformanceSeatSelectionSession(15);

    expect(sessionStorage.getItem(getPerformanceSeatSessionStorageKey(15))).toBeNull();
  });

  it("금액과 점유 남은 시간을 포맷한다", () => {
    expect(formatBookingAmount(150_000)).toBe("150,000원");
    expect(getRemainingSeconds("2026-09-15T13:00:05.001Z", Date.parse("2026-09-15T13:00:00.000Z"))).toBe(6);
    expect(getRemainingSeconds("2026-09-15T12:59:59.000Z", Date.parse("2026-09-15T13:00:00.000Z"))).toBe(0);
    expect(getRemainingSeconds("invalid-date", Date.parse("2026-09-15T13:00:00.000Z"))).toBe(0);
  });

  it("예매 정보 확인 상태의 공연·공연장·서버 리뷰 스냅샷 계약을 검증한다", () => {
    const state = { performance, venue, venueSeats, review };

    expect(isPerformanceCheckoutLocationState(state, 10)).toBe(true);
    expect(isPerformanceCheckoutLocationState(null, 10)).toBe(false);
    expect(isPerformanceCheckoutLocationState({ ...state, performance: null }, 10)).toBe(false);
    expect(isPerformanceCheckoutLocationState({ ...state, venue: null }, 10)).toBe(false);
    expect(isPerformanceCheckoutLocationState({ ...state, venueSeats: [null] }, 10)).toBe(false);
    expect(isPerformanceCheckoutLocationState({ ...state, review: null }, 10)).toBe(false);
    expect(isPerformanceCheckoutLocationState({ ...state, review: { ...review, reviewToken: "" } }, 10)).toBe(false);
    expect(isPerformanceCheckoutLocationState({ ...state, review: { ...review, groupId: null } }, 10)).toBe(false);
    expect(isPerformanceCheckoutLocationState({ ...state, review: { ...review, sessionId: 42 } }, 10)).toBe(false);
    expect(isPerformanceCheckoutLocationState({ ...state, review: { ...review, expiresAt: null } }, 10)).toBe(false);
    expect(isPerformanceCheckoutLocationState({ ...state, review: { ...review, performanceId: 11 } }, 10)).toBe(false);
    expect(isPerformanceCheckoutLocationState({ ...state, venueSeats: [] }, 10)).toBe(false);
    expect(isPerformanceCheckoutLocationState({ ...state, review: { ...review, venueSeatIds: [999] } }, 10)).toBe(false);
    expect(isPerformanceCheckoutLocationState({ ...state, review: { ...review, venueSeatIds: [101, 101] } }, 10)).toBe(false);
    expect(isPerformanceCheckoutLocationState(state, 11)).toBe(false);
  });
});
