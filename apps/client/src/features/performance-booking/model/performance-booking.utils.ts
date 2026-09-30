import { PERFORMANCE_SEAT_SESSION_STORAGE_PREFIX } from "./performance-booking.constants";
import type { PerformanceCheckoutLocationState, PerformanceSummary, VenueSeatSummary, VenueSummary } from "./performance-booking.types";

export const formatBookingAmount = (amount: number) => `${new Intl.NumberFormat("ko-KR").format(amount)}원`;

export const getRemainingSeconds = (expiresAt: string, now = Date.now()) => {
  const expiresAtTime = new Date(expiresAt).getTime();
  return Number.isFinite(expiresAtTime) ? Math.max(0, Math.ceil((expiresAtTime - now) / 1_000)) : 0;
};

export const getPerformanceSeatSessionStorageKey = (performanceId: number) => `${PERFORMANCE_SEAT_SESSION_STORAGE_PREFIX}:${performanceId}`;

const getPerformanceCheckoutReviewTokenStorageKey = (performanceId: number, sessionId: string) =>
  `${getPerformanceSeatSessionStorageKey(performanceId)}:checkout-review:${sessionId}`;

export const createPerformanceSeatSelectionSession = (performanceId: number) => {
  const sessionId = crypto.randomUUID();
  window.sessionStorage.setItem(getPerformanceSeatSessionStorageKey(performanceId), sessionId);
  return sessionId;
};

export const getOrCreatePerformanceSeatSelectionSession = (performanceId: number) => {
  const storedSessionId = window.sessionStorage.getItem(getPerformanceSeatSessionStorageKey(performanceId));
  if (storedSessionId) return storedSessionId;

  return createPerformanceSeatSelectionSession(performanceId);
};

export const getOrCreatePerformanceCheckoutReviewToken = (performanceId: number, sessionId: string) => {
  const storageKey = getPerformanceCheckoutReviewTokenStorageKey(performanceId, sessionId);
  const storedReviewToken = window.sessionStorage.getItem(storageKey);
  if (storedReviewToken) return storedReviewToken;

  const reviewToken = crypto.randomUUID();
  window.sessionStorage.setItem(storageKey, reviewToken);
  return reviewToken;
};

export const clearPerformanceCheckoutReviewToken = (performanceId: number, sessionId: string, reviewToken: string) => {
  if (typeof window === "undefined") return;

  const storageKey = getPerformanceCheckoutReviewTokenStorageKey(performanceId, sessionId);
  if (window.sessionStorage.getItem(storageKey) === reviewToken) window.sessionStorage.removeItem(storageKey);
};

export const clearPerformanceSeatSelectionSession = (performanceId: number) => {
  if (typeof window === "undefined") return;

  const storageKey = getPerformanceSeatSessionStorageKey(performanceId);
  const sessionId = window.sessionStorage.getItem(storageKey);
  window.sessionStorage.removeItem(storageKey);
  if (sessionId) window.sessionStorage.removeItem(getPerformanceCheckoutReviewTokenStorageKey(performanceId, sessionId));
};

const isCheckoutReview = (value: unknown): value is PerformanceCheckoutLocationState["review"] => {
  if (!value || typeof value !== "object") return false;

  const review = value as Record<string, unknown>;
  return (
    typeof review.reviewToken === "string" &&
    review.reviewToken.length > 0 &&
    typeof review.groupId === "string" &&
    (review.sessionId === null || typeof review.sessionId === "string") &&
    typeof review.performanceId === "number" &&
    Array.isArray(review.venueSeatIds) &&
    review.venueSeatIds.length > 0 &&
    review.venueSeatIds.every((seatId) => typeof seatId === "number") &&
    typeof review.expiresAt === "string"
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
  const { performance, venue, venueSeats, review } = value;
  if (
    !Number.isInteger(performanceId) ||
    performanceId <= 0 ||
    !isPerformance(performance) ||
    !isVenue(venue) ||
    !Array.isArray(venueSeats) ||
    !venueSeats.every(isVenueSeat) ||
    !isCheckoutReview(review)
  ) {
    return false;
  }

  const selectedSeatIds = review.venueSeatIds;
  const venueSeatIds = new Set(venueSeats.map((seat) => seat.id));
  return (
    performance.id === performanceId &&
    performance.venueId === venue.id &&
    review.performanceId === performanceId &&
    new Set(selectedSeatIds).size === selectedSeatIds.length &&
    selectedSeatIds.every((seatId) => venueSeatIds.has(seatId))
  );
};
