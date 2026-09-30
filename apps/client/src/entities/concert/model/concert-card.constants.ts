import type { AspectRatio, DisplayOptions, EffectOptions } from "./concert-card.types";

export const DEFAULT_MAX_TILT = 5;
export const DEFAULT_SHADOW_OFFSET = 18;

export const ASPECT_RATIO_CLASS: Record<AspectRatio, string> = {
  "9/16": "aspect-9/16",
  "3/4": "aspect-3/4",
  "1/1": "aspect-square",
  "4/3": "aspect-4/3",
  "16/9": "aspect-video",
};

export const DEFAULT_DISPLAY_OPTIONS: DisplayOptions = {
  showGenre: true,
  showTitle: true,
  showPlaceName: true,
};

export const DISABLED_EFFECT_OPTIONS: EffectOptions = {
  disableTilt: true,
  disableScale: true,
  disableGlare: true,
  disableShadow: true,
};
