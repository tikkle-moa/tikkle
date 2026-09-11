import { getPaymentCustomerKeyStorageKey } from "./payment.constants";
import type { PaymentCommandResponse, PaymentOrder, PaymentOrderSeat } from "./payment.types";

export const formatPaymentAmount = (amount: number) => `${new Intl.NumberFormat("ko-KR").format(amount)}원`;

export const getPaymentCustomerKey = (userId: number) => {
  const storageKey = getPaymentCustomerKeyStorageKey(userId);
  const savedCustomerKey = sessionStorage.getItem(storageKey);

  if (savedCustomerKey) {
    return savedCustomerKey;
  }

  const customerKey = `tikkle_${crypto.randomUUID()}`;
  sessionStorage.setItem(storageKey, customerKey);
  return customerKey;
};

const isPaymentOrderSeat = (value: unknown): value is PaymentOrderSeat => {
  if (!value || typeof value !== "object") {
    return false;
  }

  const seat = value as Record<string, unknown>;
  return (
    typeof seat.venueSeatId === "number" &&
    typeof seat.sectionName === "string" &&
    typeof seat.seatLabel === "string" &&
    typeof seat.price === "number"
  );
};

export const isPaymentOrder = (value: unknown): value is PaymentOrder => {
  if (!value || typeof value !== "object") {
    return false;
  }

  const order = value as Record<string, unknown>;
  return (
    typeof order.reservationId === "number" &&
    typeof order.orderId === "string" &&
    typeof order.orderName === "string" &&
    typeof order.amount === "number" &&
    typeof order.paymentExpiresAt === "string" &&
    typeof order.concertTitle === "string" &&
    typeof order.performanceName === "string" &&
    typeof order.performanceStartsAt === "string" &&
    typeof order.venueName === "string" &&
    Array.isArray(order.seats) &&
    order.seats.every(isPaymentOrderSeat)
  );
};

export const parsePaymentCommandResponse = (body: string): PaymentCommandResponse | null => {
  try {
    const response = JSON.parse(body) as Partial<PaymentCommandResponse>;

    if (typeof response.requestId !== "string" || typeof response.action !== "string" || typeof response.success !== "boolean") {
      return null;
    }

    return response as PaymentCommandResponse;
  } catch {
    return null;
  }
};
