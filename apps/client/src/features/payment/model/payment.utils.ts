import { PAYMENT_CUSTOMER_KEY_STORAGE_PREFIX } from "./payment.constants";
import type { PaymentOrder } from "./payment.types";

export const isPaymentOrder = (value: unknown): value is PaymentOrder => {
  if (!value || typeof value !== "object") return false;

  const order = value as Record<string, unknown>;
  return (
    typeof order.reservationId === "number" &&
    typeof order.orderId === "string" &&
    typeof order.orderName === "string" &&
    typeof order.amount === "number" &&
    typeof order.paymentExpiresAt === "string" &&
    typeof order.concertTitle === "string" &&
    (typeof order.posterUrl === "string" || order.posterUrl === null) &&
    typeof order.performanceName === "string" &&
    typeof order.performanceStartsAt === "string" &&
    typeof order.venueName === "string" &&
    Array.isArray(order.seats) &&
    order.seats.every((seat) => {
      if (!seat || typeof seat !== "object") return false;

      const value = seat as Record<string, unknown>;
      return (
        typeof value.venueSeatId === "number" &&
        typeof value.sectionName === "string" &&
        typeof value.seatLabel === "string" &&
        typeof value.price === "number"
      );
    })
  );
};

export const getPaymentCustomerKey = (userId: number) => {
  const storageKey = `${PAYMENT_CUSTOMER_KEY_STORAGE_PREFIX}.${userId}`;
  const savedCustomerKey = sessionStorage.getItem(storageKey);

  if (savedCustomerKey) {
    return savedCustomerKey;
  }

  const customerKey = `tikkle_${crypto.randomUUID()}`;
  sessionStorage.setItem(storageKey, customerKey);
  return customerKey;
};
