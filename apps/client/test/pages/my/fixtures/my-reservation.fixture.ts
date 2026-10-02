import type { MyReservation } from "@entities/reservation";

export const makeMyReservation = (overrides: Partial<MyReservation> = {}): MyReservation => ({
  id: 501,
  concertTitle: "콘서트 A",
  posterUrl: "https://example.com/poster.jpg",
  performanceName: "금요일 공연",
  performanceStartsAt: "2026-12-18T19:00:00",
  venueName: "공연장 A",
  seats: [
    { sectionName: "R석", seatLabel: "A-12" },
    { sectionName: "R석", seatLabel: "A-13" },
  ],
  amount: 132000,
  status: "SUCCEEDED",
  createdAt: "2026-09-30T12:00:00",
  ...overrides,
});
