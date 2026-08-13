import type { AspectRatio } from "./concert-card.types";

export const DEFAULT_MAX_TILT = 5;
export const DEFAULT_SHADOW_OFFSET = 18;

export const ASPECT_RATIO_CLASS: Record<AspectRatio, string> = {
  "9/16": "aspect-9/16",
  "3/4": "aspect-3/4",
  "1/1": "aspect-square",
  "4/3": "aspect-4/3",
  "16/9": "aspect-video",
};
