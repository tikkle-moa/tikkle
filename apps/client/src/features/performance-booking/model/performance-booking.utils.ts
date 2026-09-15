import type { StartCheckoutMessageData } from "@tikkle/api-types";

import type { BookingCommandResponse } from "./performance-booking.types";

export const formatBookingAmount = (amount: number) => `${new Intl.NumberFormat("ko-KR").format(amount)}원`;

export const parseBookingCommandResponse = (body: string) => {
  try {
    const response = JSON.parse(body) as unknown;

    if (!response || typeof response !== "object") return null;

    const value = response as Record<string, unknown>;

    if (typeof value.requestId !== "string" || typeof value.success !== "boolean") {
      return null;
    }

    return response as BookingCommandResponse;
  } catch {
    return null;
  }
};

export const isStartCheckoutData = (value: unknown): value is StartCheckoutMessageData => {
  if (!value || typeof value !== "object") return false;

  const data = value as Record<string, unknown>;
  return (
    typeof data.reservationId === "number" &&
    typeof data.orderId === "string" &&
    typeof data.orderName === "string" &&
    typeof data.amount === "number" &&
    typeof data.paymentExpiresAt === "string"
  );
};

export const getRemainingSeconds = (expiresAt: string, now = Date.now()) => {
  const expiresAtTime = new Date(expiresAt).getTime();
  return Number.isFinite(expiresAtTime) ? Math.max(0, Math.ceil((expiresAtTime - now) / 1_000)) : 0;
};
