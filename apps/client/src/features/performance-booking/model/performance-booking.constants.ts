export const CHECKOUT_REVIEW_RESPONSE_TIMEOUT_MS = 8_000;
export const CHECKOUT_REVIEW_MAX_REQUEST_ATTEMPTS = 2;

export const START_CHECKOUT_RESPONSE_TIMEOUT_MS = 8_000;
export const START_CHECKOUT_MAX_REQUEST_ATTEMPTS = 2;

// 서버가 예매 그룹을 관리하기 전까지 탭별 Hold 범위를 지정하도록 Hold·예매 확인 API에 sessionId를 전달한다.
// 서버 관리 그룹 세션이 도입되면 canonical groupId를 사용하고 이 클라이언트 sessionId를 제거한다.
export const PERFORMANCE_SEAT_SESSION_STORAGE_PREFIX = "tikkle.performance-seat-session";
