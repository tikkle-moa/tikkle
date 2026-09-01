import { VENUE_MAP_MIN_ZOOM } from "./venue-map-viewport.constants";
import type { Point, UseVenueMapViewportParams, Viewport } from "./venue-map-viewport.types";

export const createInitialViewport = ({ width, height }: UseVenueMapViewportParams): Viewport => ({
  zoom: VENUE_MAP_MIN_ZOOM,
  centerX: width / 2,
  centerY: height / 2,
});

export const getDistance = (first: Point, second: Point) => Math.hypot(first.x - second.x, first.y - second.y);

export const getMidpoint = (first: Point, second: Point): Point => ({
  x: (first.x + second.x) / 2,
  y: (first.y + second.y) / 2,
});

export const clampViewport = (next: Viewport, width: number, height: number): Viewport => {
  const viewWidth = width / next.zoom;
  const viewHeight = height / next.zoom;

  return {
    zoom: next.zoom,
    centerX: Math.min(Math.max(next.centerX, viewWidth / 2), width - viewWidth / 2),
    centerY: Math.min(Math.max(next.centerY, viewHeight / 2), height - viewHeight / 2),
  };
};

export const zoomAt = (current: Viewport, startPoint: Point, targetPoint: Point, zoom: number, width: number, height: number): Viewport => {
  const currentWidth = width / current.zoom;
  const currentHeight = height / current.zoom;
  const currentLeft = current.centerX - currentWidth / 2;
  const currentTop = current.centerY - currentHeight / 2;
  const anchorX = currentLeft + startPoint.x * currentWidth;
  const anchorY = currentTop + startPoint.y * currentHeight;
  const nextWidth = width / zoom;
  const nextHeight = height / zoom;

  return {
    zoom,
    centerX: anchorX - targetPoint.x * nextWidth + nextWidth / 2,
    centerY: anchorY - targetPoint.y * nextHeight + nextHeight / 2,
  };
};
