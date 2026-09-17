import type { TooltipPlacement } from "./venue-map.types";

export const SECTION_COLOR_LIGHTNESS = 52;
export const SECTION_COLOR_SATURATION = 68;

export const TOOLTIP_POSITION_CLASS_MAP: Record<TooltipPlacement, string> = {
  "top-left": "top-3 left-3",
  "top-right": "top-3 right-3",
  "bottom-left": "bottom-3 left-3",
  "bottom-right": "bottom-3 right-3",
};
