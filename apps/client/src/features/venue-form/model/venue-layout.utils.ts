import { SECTION_COLORS } from "./venue-layout.constants";
import type { VenueLayoutDragState } from "./venue-layout.types";

export const getSectionColor = (sectionName: string) => {
  const hash = Array.from(sectionName || "미지정").reduce((value, character) => (value * 31 + character.charCodeAt(0)) >>> 0, 0);
  return SECTION_COLORS[hash % SECTION_COLORS.length];
};

export const getLayoutClassName = (isSubmitting: boolean, dragState: VenueLayoutDragState | null, isAltPressed: boolean) => {
  if (isSubmitting) return "cursor-not-allowed opacity-60";
  if (dragState?.type === "pan") return "cursor-grabbing touch-none";
  if (dragState?.type === "select" || isAltPressed) return "cursor-crosshair touch-none";
  return "cursor-grab touch-none";
};
