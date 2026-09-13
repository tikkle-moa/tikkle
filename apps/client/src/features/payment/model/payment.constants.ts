export const PAYMENT_STOMP_DESTINATIONS = {
  request: "/api/reservation/sync",
  response: "/user/queue/reservation",
} as const;

export const PAYMENT_ROUTES = {
  success: "/payments/success",
  fail: "/payments/fail",
} as const;
