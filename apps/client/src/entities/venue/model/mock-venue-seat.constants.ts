import type { VenueSeatStatus } from "./venue-seat.types";

export const MOCK_VENUE_SEAT_BOARD: VenueSeatStatus[][] = [
  ["booked", "available", "available", "available", "available", "available"],
  ["available", "held_by_other", "held_by_other", "available", "available", "available"],
  ["available", "available", "held_by_me", "held_by_me", "held_by_me", "available"],
  ["available", "available", "available", "available", "available", "booked"],
];

export const MOCK_GROUP_MEMBERS = [
  { initial: "민", color: "#ec4899" },
  { initial: "지", color: "#2563eb" },
  { initial: "유", color: "#16a34a" },
];
