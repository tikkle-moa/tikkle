import { type PointerEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";

import { VENUE_MAP_DRAG_THRESHOLD, VENUE_MAP_MAX_ZOOM, VENUE_MAP_MIN_ZOOM, VENUE_MAP_ZOOM_FACTOR } from "./venue-map-viewport.constants";
import type { Gesture, PanGesture, PinchGesture, Point, UseVenueMapViewportParams, Viewport } from "./venue-map-viewport.types";
import { clampViewport, createInitialViewport, getDistance, getMidpoint, zoomAt } from "./venue-map-viewport.utils";

export const useVenueMapViewport = ({ width, height }: UseVenueMapViewportParams) => {
  const [viewport, setViewport] = useState(() => createInitialViewport({ width, height }));
  const [isDragging, setIsDragging] = useState(false);
  const viewportRef = useRef<Viewport>(viewport);
  const pointersRef = useRef(new Map<number, Point>());
  const gestureRef = useRef<Gesture | null>(null);
  const ignoreSeatClickRef = useRef(false);
  const mapRef = useRef<HTMLDivElement>(null);

  const getCurrentViewport = useCallback(() => viewportRef.current, []);

  const setNextViewport = useCallback(
    (next: Viewport) => {
      const clamped = clampViewport(next, width, height);

      viewportRef.current = clamped;
      setViewport(clamped);
    },
    [height, width],
  );

  const getPoint = (event: PointerEvent<SVGSVGElement>): Point => {
    const bounds = event.currentTarget.getBoundingClientRect();

    return {
      x: (event.clientX - bounds.left) / bounds.width,
      y: (event.clientY - bounds.top) / bounds.height,
    };
  };

  const startPan = (point: Point) => {
    const gesture: PanGesture = {
      kind: "pan",
      startViewport: getCurrentViewport(),
      startPoint: point,
      hasMoved: false,
    };

    gestureRef.current = gesture;
  };

  const startPinch = (first: Point, second: Point) => {
    const gesture: PinchGesture = {
      kind: "pinch",
      startViewport: getCurrentViewport(),
      startDistance: getDistance(first, second),
      startMidpoint: getMidpoint(first, second),
      hasMoved: false,
    };

    gestureRef.current = gesture;
  };

  const changeZoom = useCallback(
    (factor: number) => {
      const current = getCurrentViewport();
      const center = { x: 0.5, y: 0.5 };
      const zoom = Math.min(Math.max(current.zoom * factor, VENUE_MAP_MIN_ZOOM), VENUE_MAP_MAX_ZOOM);

      setNextViewport(zoomAt(current, center, center, zoom, width, height));
    },
    [getCurrentViewport, height, setNextViewport, width],
  );

  const handlePointerDown = (event: PointerEvent<SVGSVGElement>) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;

    const isSeatTarget = event.target instanceof Element && event.target.closest("[data-seat-id]") !== null;
    if (isSeatTarget) return;

    event.currentTarget.setPointerCapture(event.pointerId);
    pointersRef.current.set(event.pointerId, getPoint(event));

    if (pointersRef.current.size >= 2) {
      const [first, second] = [...pointersRef.current.values()];

      startPinch(first!, second!);
      return;
    }

    if (getCurrentViewport().zoom > VENUE_MAP_MIN_ZOOM) {
      startPan(getPoint(event));
    }
  };

  const handlePointerMove = (event: PointerEvent<SVGSVGElement>) => {
    if (!pointersRef.current.has(event.pointerId)) return;

    pointersRef.current.set(event.pointerId, getPoint(event));

    if (pointersRef.current.size >= 2) {
      const gesture = gestureRef.current as PinchGesture;
      const [first, second] = [...pointersRef.current.values()];
      const zoom = Math.min(
        Math.max(gesture.startViewport.zoom * (getDistance(first!, second!) / gesture.startDistance), VENUE_MAP_MIN_ZOOM),
        VENUE_MAP_MAX_ZOOM,
      );

      gesture.hasMoved = true;
      setIsDragging(true);
      setNextViewport(zoomAt(gesture.startViewport, gesture.startMidpoint, getMidpoint(first!, second!), zoom, width, height));
      return;
    }

    const gesture = gestureRef.current;
    if (!gesture || gesture.kind !== "pan") return;

    const point = getPoint(event);
    if (getDistance(gesture.startPoint, point) < VENUE_MAP_DRAG_THRESHOLD) return;

    const viewWidth = width / gesture.startViewport.zoom;
    const viewHeight = height / gesture.startViewport.zoom;

    gesture.hasMoved = true;
    setIsDragging(true);
    setNextViewport({
      zoom: gesture.startViewport.zoom,
      centerX: gesture.startViewport.centerX + (gesture.startPoint.x - point.x) * viewWidth,
      centerY: gesture.startViewport.centerY + (gesture.startPoint.y - point.y) * viewHeight,
    });
  };

  const handlePointerUp = (event: PointerEvent<SVGSVGElement>) => {
    const gesture = gestureRef.current;

    if (gesture?.hasMoved) {
      ignoreSeatClickRef.current = true;
    }

    pointersRef.current.delete(event.pointerId);

    if (pointersRef.current.size === 1 && getCurrentViewport().zoom > VENUE_MAP_MIN_ZOOM) {
      startPan([...pointersRef.current.values()][0]);
    } else {
      gestureRef.current = null;
    }

    setIsDragging(false);
  };

  const handleAltWheel = useCallback(
    (event: WheelEvent) => {
      if (!event.altKey) return;

      event.preventDefault();
      event.stopPropagation();

      const mapElement = event.currentTarget as HTMLDivElement;
      const bounds = mapElement.getBoundingClientRect();
      const point = {
        x: (event.clientX - bounds.left) / bounds.width,
        y: (event.clientY - bounds.top) / bounds.height,
      };
      const current = getCurrentViewport();
      const zoom = Math.min(
        Math.max(current.zoom * (event.deltaY < 0 ? VENUE_MAP_ZOOM_FACTOR : 1 / VENUE_MAP_ZOOM_FACTOR), VENUE_MAP_MIN_ZOOM),
        VENUE_MAP_MAX_ZOOM,
      );

      setNextViewport(zoomAt(current, point, point, zoom, width, height));
    },
    [getCurrentViewport, height, setNextViewport, width],
  );

  useEffect(() => {
    const mapElement = mapRef.current;
    if (!mapElement) return;

    const preventBrowserPinch = (event: TouchEvent) => {
      if (event.touches.length >= 2) {
        event.preventDefault();
      }
    };

    const preventSafariGesture = (event: Event) => {
      event.preventDefault();
    };

    mapElement.addEventListener("wheel", handleAltWheel, { passive: false });
    mapElement.addEventListener("touchmove", preventBrowserPinch, { passive: false });
    mapElement.addEventListener("gesturestart", preventSafariGesture, { passive: false });
    mapElement.addEventListener("gesturechange", preventSafariGesture, { passive: false });

    return () => {
      mapElement.removeEventListener("wheel", handleAltWheel);
      mapElement.removeEventListener("touchmove", preventBrowserPinch);
      mapElement.removeEventListener("gesturestart", preventSafariGesture);
      mapElement.removeEventListener("gesturechange", preventSafariGesture);
    };
  }, [handleAltWheel]);

  const consumeSeatClick = () => {
    const shouldIgnore = ignoreSeatClickRef.current;
    ignoreSeatClickRef.current = false;

    return shouldIgnore;
  };

  const viewBox = useMemo(() => {
    const viewWidth = width / viewport.zoom;
    const viewHeight = height / viewport.zoom;

    return `${viewport.centerX - viewWidth / 2} ${viewport.centerY - viewHeight / 2} ${viewWidth} ${viewHeight}`;
  }, [height, viewport, width]);

  return {
    mapRef,
    viewBox,
    zoom: viewport.zoom,
    isDragging,
    canZoomIn: viewport.zoom < VENUE_MAP_MAX_ZOOM,
    canZoomOut: viewport.zoom > VENUE_MAP_MIN_ZOOM,
    zoomIn: () => changeZoom(VENUE_MAP_ZOOM_FACTOR),
    zoomOut: () => changeZoom(1 / VENUE_MAP_ZOOM_FACTOR),
    consumeSeatClick,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
  };
};
