export interface DisplayOptions {
  showStatus?: boolean;
  showGenre?: boolean;
  showTitle?: boolean;
  showPlaceName?: boolean;
  showPeriod?: boolean;
}

export interface EffectOptions {
  disableTilt?: boolean;
  disableScale?: boolean;
  disableGlare?: boolean;
  disableShadow?: boolean;
}

export interface Tilt {
  rotateX: number;
  rotateY: number;
}

export interface Glare {
  x: number;
  y: number;
}

export type AspectRatio = "9/16" | "3/4" | "1/1" | "4/3" | "16/9";
