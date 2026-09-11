export const PAYMENT_STOMP_DESTINATIONS = {
  request: "/api/reservation/sync",
  response: "/user/queue/reservation",
} as const;

export const isPaymentUiFixtureEnabled = import.meta.env.DEV && import.meta.env.VITE_PAYMENT_UI_FIXTURE === "true";

export const PAYMENT_ROUTES = {
  success: "/payments/success",
  fail: "/payments/fail",
} as const;

const PAYMENT_CUSTOMER_KEY_STORAGE_PREFIX = "tikkle.payment.customer-key";

export const getPaymentCustomerKeyStorageKey = (userId: number) => `${PAYMENT_CUSTOMER_KEY_STORAGE_PREFIX}.${userId}`;
