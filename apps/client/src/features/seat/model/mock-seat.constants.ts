import type { SeatStatus } from "@entities/seat";

export const MOCK_SEAT_BOARD: SeatStatus[][] = [
  ["booked", "available", "available", "available", "available", "available"],
  ["available", "held_other", "held_other", "available", "available", "available"],
  ["available", "available", "held_mine", "held_mine", "held_mine", "available"],
  ["available", "available", "available", "available", "available", "booked"],
];

export const MOCK_GROUP_MEMBERS = [
  { initial: "민", color: "#ec4899" },
  { initial: "지", color: "#2563eb" },
  { initial: "유", color: "#16a34a" },
];
