import type { PerformanceResponse } from "@entities/performance";
import type { VenueResponse, VenueSeatResponse } from "@entities/venue";

import type { PaymentOrder } from "@features/payment";

export const PERFORMANCE_CHECKOUT_FIXTURE_RESERVATION_ID = 501;

export interface PerformanceCheckoutFixture {
  performance: PerformanceResponse;
  venue: VenueResponse;
  venueSeats: VenueSeatResponse[];
  selectedSeatIds: number[];
  paymentOrder: PaymentOrder;
}

export const createPerformanceCheckoutFixture = () =>
  ({
    performance: {
      id: 10,
      concertId: 20,
      venueId: 1,
      name: "Tikkle Live 1회차",
      startsAt: "2026-09-01T19:00:00",
      bookingOpensAt: null,
      createdAt: "2026-08-25T12:00:00",
      status: "AVAILABLE",
    },
    venue: {
      id: 1,
      name: "올림픽공원 KSPO DOME",
      address: "서울특별시 송파구 올림픽로 424",
      description: "Tikkle Live fixture 공연장",
      width: 100,
      height: 70,
      stagePositionX: 50,
      stagePositionY: 10,
      stageWidth: 36,
      stageHeight: 8,
      createdAt: "2026-08-25T12:00:00",
    },
    venueSeats: [
      {
        id: 101,
        venueId: 1,
        sectionName: "A구역",
        seatNumber: 1,
        seatLabel: "A구역 1열 1번",
        price: 150_000,
        positionX: 20,
        positionY: 28,
        createdAt: "2026-08-25T12:00:00",
      },
      {
        id: 102,
        venueId: 1,
        sectionName: "A구역",
        seatNumber: 2,
        seatLabel: "A구역 1열 2번",
        price: 150_000,
        positionX: 23,
        positionY: 28,
        createdAt: "2026-08-25T12:00:00",
      },
    ],
    selectedSeatIds: [101, 102],
    paymentOrder: {
      reservationId: PERFORMANCE_CHECKOUT_FIXTURE_RESERVATION_ID,
      orderId: `tikkle-fixture-${PERFORMANCE_CHECKOUT_FIXTURE_RESERVATION_ID}`,
      orderName: "Tikkle Live 2석",
      amount: 300_000,
      paymentExpiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
      concertTitle: "Tikkle Live",
      posterUrl: "https://picsum.photos/seed/concert1/400/600",
      performanceName: "Tikkle Live 1회차",
      performanceStartsAt: "2026-09-01T19:00:00",
      venueName: "올림픽공원 KSPO DOME",
      seats: [
        { venueSeatId: 101, sectionName: "A구역", seatLabel: "A구역 1열 1번", price: 150_000 },
        { venueSeatId: 102, sectionName: "A구역", seatLabel: "A구역 1열 2번", price: 150_000 },
      ],
    },
  }) satisfies PerformanceCheckoutFixture;
