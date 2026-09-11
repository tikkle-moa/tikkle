import type { PaymentOrder } from "./payment.types";

export const PAYMENT_FIXTURE_RESERVATION_ID = 501;

export const createPaymentOrderFixture = (reservationId: number): PaymentOrder => ({
  reservationId,
  orderId: `tikkle-fixture-${reservationId}`,
  orderName: "2026 Summer Festival 2석",
  amount: 300_000,
  paymentExpiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
  concertTitle: "2026 Summer Festival",
  performanceName: "2026 Summer Festival 1회차",
  performanceStartsAt: "2026-08-20T19:00:00",
  venueName: "올림픽공원 KSPO DOME",
  seats: [
    { venueSeatId: 101, sectionName: "A구역", seatLabel: "A구역 1열 1번", price: 150_000 },
    { venueSeatId: 102, sectionName: "A구역", seatLabel: "A구역 1열 2번", price: 150_000 },
  ],
});
