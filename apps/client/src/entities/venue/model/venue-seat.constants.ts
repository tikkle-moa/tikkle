import type { VenueSeatStatus, VenueSeatStyle } from "./venue-seat.types";

export const VENUE_SEAT_STYLE_MAP: Record<VenueSeatStatus, VenueSeatStyle> = {
  available: {
    label: "선택 가능",
    style: "bg-green-100 border-green-300 hover:bg-green-200",
    fill: "#dcfce7",
    stroke: "#86efac",
  },
  held_by_my_group: {
    label: "우리 그룹",
    style: "bg-brand-accent border-brand-accent shadow-brand-accent/30 shadow-sm",
    fill: "#ec4899",
    stroke: "#db2777",
  },
  held_by_other_group: {
    label: "다른 그룹",
    style: "bg-brand-primary border-brand-primary shadow-brand-primary/30 shadow-sm",
    fill: "#7c3aed",
    stroke: "#6d28d9",
  },
  booked: {
    label: "예약 완료",
    style: "bg-gray-300 border-gray-400",
    fill: "#d1d5db",
    stroke: "#9ca3af",
  },
};

export const SEAT_STATUS_LEGEND = Object.entries(VENUE_SEAT_STYLE_MAP);
