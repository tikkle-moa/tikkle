import { type KeyboardEvent, type PointerEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";

interface UseVenueMapViewportParams {
  width: number;
  height: number;
}

interface Point {
  x: number;
  y: number;
}

interface Viewport {
  zoom: number;
  centerX: number;
  centerY: number;
}

interface Gesture {
  kind: "pan" | "pinch";
  startViewport: Viewport;
  startPoint?: Point;
  startDistance?: number;
  startMidpoint?: Point;
  hasMoved: boolean;
}

type PinchGesture = Gesture & {
  kind: "pinch";
  startDistance: number;
  startMidpoint: Point;
};

const MIN_ZOOM = 1;
const MAX_ZOOM = 4;
const ZOOM_FACTOR = 1.2;
const DRAG_THRESHOLD = 0.01;

const createInitialViewport = ({ width, height }: UseVenueMapViewportParams): Viewport => ({
  zoom: MIN_ZOOM,
  centerX: width / 2,
  centerY: height / 2,
});

const getDistance = (first: Point, second: Point) => Math.hypot(first.x - second.x, first.y - second.y);

const getMidpoint = (first: Point, second: Point): Point => ({
  x: (first.x + second.x) / 2,
  y: (first.y + second.y) / 2,
});

const clampViewport = (next: Viewport, width: number, height: number): Viewport => {
  const viewWidth = width / next.zoom;
  const viewHeight = height / next.zoom;

  return {
    zoom: next.zoom,
    centerX: Math.min(Math.max(next.centerX, viewWidth / 2), width - viewWidth / 2),
    centerY: Math.min(Math.max(next.centerY, viewHeight / 2), height - viewHeight / 2),
  };
};

const zoomAt = (current: Viewport, startPoint: Point, targetPoint: Point, zoom: number, width: number, height: number): Viewport => {
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
    gestureRef.current = {
      kind: "pan",
      startViewport: getCurrentViewport(),
      startPoint: point,
      hasMoved: false,
    };
  };

  const startPinch = (first: Point, second: Point) => {
    gestureRef.current = {
      kind: "pinch",
      startViewport: getCurrentViewport(),
      startDistance: getDistance(first, second),
      startMidpoint: getMidpoint(first, second),
      hasMoved: false,
    };
  };

  const changeZoom = useCallback(
    (factor: number) => {
      const current = getCurrentViewport();
      const center = { x: 0.5, y: 0.5 };
      const zoom = Math.min(Math.max(current.zoom * factor, MIN_ZOOM), MAX_ZOOM);

      setNextViewport(zoomAt(current, center, center, zoom, width, height));
    },
    [getCurrentViewport, height, setNextViewport, width],
  );

  const handlePointerDown = (event: PointerEvent<SVGSVGElement>) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;

    event.currentTarget.setPointerCapture(event.pointerId);
    pointersRef.current.set(event.pointerId, getPoint(event));

    if (pointersRef.current.size >= 2) {
      const [first, second] = [...pointersRef.current.values()];

      startPinch(first!, second!);
      return;
    }

    if (getCurrentViewport().zoom > MIN_ZOOM) {
      startPan(getPoint(event));
    }
  };

  const handlePointerMove = (event: PointerEvent<SVGSVGElement>) => {
    if (!pointersRef.current.has(event.pointerId)) return;

    pointersRef.current.set(event.pointerId, getPoint(event));

    if (pointersRef.current.size >= 2) {
      const gesture = gestureRef.current as PinchGesture;
      const [first, second] = [...pointersRef.current.values()];
      const zoom = Math.min(Math.max(gesture.startViewport.zoom * (getDistance(first!, second!) / gesture.startDistance), MIN_ZOOM), MAX_ZOOM);

      gesture.hasMoved = true;
      setIsDragging(true);
      setNextViewport(zoomAt(gesture.startViewport, gesture.startMidpoint, getMidpoint(first!, second!), zoom, width, height));
      return;
    }

    const gesture = gestureRef.current;
    if (!gesture || gesture.kind !== "pan" || !gesture.startPoint) return;

    const point = getPoint(event);
    if (getDistance(gesture.startPoint, point) < DRAG_THRESHOLD) return;

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

    if (pointersRef.current.size === 1 && getCurrentViewport().zoom > MIN_ZOOM) {
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
      const zoom = Math.min(Math.max(current.zoom * (event.deltaY < 0 ? ZOOM_FACTOR : 1 / ZOOM_FACTOR), MIN_ZOOM), MAX_ZOOM);

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

  const handleKeyDown = (event: KeyboardEvent<SVGSVGElement>) => {
    const current = getCurrentViewport();
    const center = { x: 0.5, y: 0.5 };

    if (event.key === "+" || event.key === "=") {
      event.preventDefault();
      setNextViewport(zoomAt(current, center, center, Math.min(current.zoom * ZOOM_FACTOR, MAX_ZOOM), width, height));
    }

    if (event.key === "-" || event.key === "_") {
      event.preventDefault();
      setNextViewport(zoomAt(current, center, center, Math.max(current.zoom / ZOOM_FACTOR, MIN_ZOOM), width, height));
    }

    if (event.key === "0") {
      event.preventDefault();
      setNextViewport(createInitialViewport({ width, height }));
    }
  };

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
    canZoomIn: viewport.zoom < MAX_ZOOM,
    canZoomOut: viewport.zoom > MIN_ZOOM,
    zoomIn: () => changeZoom(ZOOM_FACTOR),
    zoomOut: () => changeZoom(1 / ZOOM_FACTOR),
    consumeSeatClick,
    handleKeyDown,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
  };
};
