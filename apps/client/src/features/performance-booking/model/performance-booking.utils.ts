import type { StartCheckoutMessageData } from "@tikkle/api-types";

import type { BookingMessage, PerformanceCheckoutLocationState } from "./performance-booking.types";

type PerformanceSummary = Pick<PerformanceCheckoutLocationState["performance"], "id" | "venueId" | "name" | "startsAt">;
type VenueSummary = Pick<PerformanceCheckoutLocationState["venue"], "id" | "name">;
type VenueSeatSummary = Pick<PerformanceCheckoutLocationState["venueSeats"][number], "id" | "sectionName" | "seatLabel" | "price">;

export const formatBookingAmount = (amount: number) => `${new Intl.NumberFormat("ko-KR").format(amount)}원`;

export const parseBookingMessage = (body: string) => {
  try {
    const response = JSON.parse(body) as unknown;

    if (!response || typeof response !== "object") return null;

    const value = response as Record<string, unknown>;

    if (typeof value.requestId !== "string" || typeof value.success !== "boolean") {
      return null;
    }

    return response as BookingMessage;
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

const isVenueSeatHold = (value: unknown): value is PerformanceCheckoutLocationState["hold"] => {
  if (!value || typeof value !== "object") return false;

  const hold = value as Record<string, unknown>;
  return (
    typeof hold.holdId === "string" &&
    typeof hold.groupId === "string" &&
    typeof hold.performanceId === "number" &&
    Array.isArray(hold.venueSeatIds) &&
    hold.venueSeatIds.length > 0 &&
    hold.venueSeatIds.every((seatId) => typeof seatId === "number") &&
    typeof hold.expiresAt === "string"
  );
};

const isPerformance = (value: unknown): value is PerformanceSummary => {
  if (!value || typeof value !== "object") return false;

  const performance = value as Record<string, unknown>;
  return (
    typeof performance.id === "number" &&
    typeof performance.venueId === "number" &&
    typeof performance.name === "string" &&
    typeof performance.startsAt === "string"
  );
};

const isVenue = (value: unknown): value is VenueSummary => {
  if (!value || typeof value !== "object") return false;

  const venue = value as Record<string, unknown>;
  return typeof venue.id === "number" && typeof venue.name === "string";
};

const isVenueSeat = (value: unknown): value is VenueSeatSummary => {
  if (!value || typeof value !== "object") return false;

  const seat = value as Record<string, unknown>;
  return typeof seat.id === "number" && typeof seat.sectionName === "string" && typeof seat.seatLabel === "string" && typeof seat.price === "number";
};

export const isPerformanceCheckoutLocationState = (state: unknown, performanceId: number): state is PerformanceCheckoutLocationState => {
  if (!state || typeof state !== "object") return false;

  const value = state as Partial<PerformanceCheckoutLocationState>;
  const { performance, venue, venueSeats, hold } = value;
  if (
    !Number.isInteger(performanceId) ||
    performanceId <= 0 ||
    !isPerformance(performance) ||
    !isVenue(venue) ||
    !Array.isArray(venueSeats) ||
    !venueSeats.every(isVenueSeat) ||
    !isVenueSeatHold(hold)
  ) {
    return false;
  }

  const selectedSeatIds = hold.venueSeatIds;
  const venueSeatIds = new Set(venueSeats.map((seat) => seat.id));
  return (
    performance.id === performanceId &&
    performance.venueId === venue.id &&
    hold.performanceId === performanceId &&
    new Set(selectedSeatIds).size === selectedSeatIds.length &&
    selectedSeatIds.every((seatId) => venueSeatIds.has(seatId))
  );
};
