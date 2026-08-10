import type { SeatStatus, SeatStyle } from "./seat.types";

export const SEAT_STYLE_MAP: Record<SeatStatus, SeatStyle> = {
  available: { label: "선택 가능", style: "bg-green-100 border-green-300 hover:bg-green-200" },
  held_mine: { label: "우리 그룹", style: "bg-brand-accent border-brand-accent shadow-brand-accent/30 shadow-sm" },
  held_other: { label: "다른 그룹", style: "bg-brand-primary border-brand-primary shadow-brand-primary/30 shadow-sm" },
  booked: { label: "예약 완료", style: "bg-gray-300 border-gray-400" },
};
