import { VENUE_SEAT_HEIGHT, VENUE_SEAT_RADIUS, VENUE_SEAT_WIDTH } from "@entities/venue";

import type { VenueFormSeat } from "./venue-form.types";
import { SECTION_COLORS } from "./venue-layout.constants";
import type { VenueLayoutDragState } from "./venue-layout.types";

export const getSectionColor = (sectionName: string) => {
  const hash = Array.from(sectionName || "미지정").reduce((value, character) => (value * 31 + character.charCodeAt(0)) >>> 0, 0);
  return SECTION_COLORS[hash % SECTION_COLORS.length];
};

export const getLayoutClassName = (isSubmitting: boolean, dragState: VenueLayoutDragState | null, isAltPressed: boolean) => {
  if (isSubmitting) return "cursor-not-allowed opacity-60";
  if (dragState?.type === "pan" || dragState?.type === "seats" || dragState?.type === "stage") return "cursor-grabbing touch-none";
  if (dragState?.type === "select" || isAltPressed) return "cursor-crosshair touch-none";
  return "cursor-grab touch-none";
};

export const getSeatPath = (seat: VenueFormSeat) => {
  const x = seat.positionX - VENUE_SEAT_WIDTH / 2;
  const y = seat.positionY - VENUE_SEAT_HEIGHT / 2;
  const right = x + VENUE_SEAT_WIDTH;
  const bottom = y + VENUE_SEAT_HEIGHT;
  const radius = VENUE_SEAT_RADIUS;

  return `M${x + radius},${y}H${right - radius}Q${right},${y} ${right},${y + radius}V${bottom - radius}Q${right},${bottom}
  ${right - radius},${bottom}H${x + radius}Q${x},${bottom} ${x},${bottom - radius}V${y + radius}Q${x},${y} ${x + radius},${y}Z`;
};
