export const PERFORMANCE_BOOKING_DESTINATIONS = {
  checkoutRequest: "/api/reservation/start-checkout",
  checkoutResponse: "/user/queue/reservation/start-checkout",
} as const;

export const CHECKOUT_REVIEW_RESPONSE_TIMEOUT_MS = 8_000;
export const CHECKOUT_REVIEW_MAX_REQUEST_ATTEMPTS = 2;

export const START_CHECKOUT_RESPONSE_TIMEOUT_MS = 8_000;
export const START_CHECKOUT_MAX_REQUEST_ATTEMPTS = 2;
