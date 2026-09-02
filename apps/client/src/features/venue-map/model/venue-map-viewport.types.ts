export interface UseVenueMapViewportParams {
  width: number;
  height: number;
}

export interface Point {
  x: number;
  y: number;
}

export interface Viewport {
  zoom: number;
  centerX: number;
  centerY: number;
}

export interface PanGesture {
  kind: "pan";
  startViewport: Viewport;
  startPoint: Point;
  hasMoved: boolean;
}

export interface PinchGesture {
  kind: "pinch";
  startViewport: Viewport;
  startDistance: number;
  startMidpoint: Point;
  hasMoved: boolean;
}

export type Gesture = PanGesture | PinchGesture;
