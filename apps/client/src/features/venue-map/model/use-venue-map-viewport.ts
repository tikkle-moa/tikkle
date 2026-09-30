import { type PointerEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";

import { VENUE_MAP_DRAG_THRESHOLD, VENUE_MAP_MIN_ZOOM, VENUE_MAP_ZOOM_FACTOR } from "./venue-map-viewport.constants";
import type { Gesture, PanGesture, PinchGesture, Point, Viewport } from "./venue-map-viewport.types";
import {
  clampViewport,
  createInitialViewport,
  createViewportViewBox,
  getDistance,
  getMidpoint,
  getVenueMapMaxZoom,
  zoomAt,
} from "./venue-map-viewport.utils";

interface UseVenueMapViewportProps {
  width: number;
  height: number;
  trackDragging?: boolean;
  directDragRendering?: boolean;
}

export const useVenueMapViewport = ({ width, height, trackDragging = true, directDragRendering = false }: UseVenueMapViewportProps) => {
  const [viewport, setViewport] = useState(() => createInitialViewport(width, height));
  const maxZoom = getVenueMapMaxZoom(width, height);
  const [isDragging, setIsDragging] = useState(false);
  const viewportRef = useRef<Viewport>(viewport);
  const pointersRef = useRef(new Map<number, Point>());
  const gestureRef = useRef<Gesture | null>(null);
  const ignoreSeatClickRef = useRef(false);
  const mapRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const pointerBoundsRef = useRef<DOMRect | null>(null);
  const pendingViewportRef = useRef<Viewport | null>(null);
  const viewportFrameRef = useRef<number | null>(null);

  const getCurrentViewport = useCallback(() => viewportRef.current, []);

  const setNextViewport = useCallback(
    (next: Viewport) => {
      const clamped = clampViewport(next, width, height);

      viewportRef.current = clamped;
      setViewport(clamped);
    },
    [height, width],
  );

  useEffect(() => {
    if (viewportRef.current.zoom <= maxZoom) return;
    setNextViewport({ ...viewportRef.current, zoom: maxZoom });
  }, [maxZoom, setNextViewport]);

  const renderViewportWithoutReact = useCallback(
    (next: Viewport) => {
      const clamped = clampViewport(next, width, height);

      viewportRef.current = clamped;
      svgRef.current?.setAttribute("viewBox", createViewportViewBox(clamped, width, height));
    },
    [height, width],
  );

  const setDraggingVisual = useCallback((dragging: boolean) => {
    const svg = svgRef.current;
    if (!svg) return;

    svg.classList.toggle("cursor-grabbing", dragging);
    svg.classList.toggle("cursor-grab", !dragging && viewportRef.current.zoom > VENUE_MAP_MIN_ZOOM);
  }, []);

  const scheduleViewportUpdate = useCallback(
    (next: Viewport) => {
      pendingViewportRef.current = next;
      if (viewportFrameRef.current !== null) return;

      viewportFrameRef.current = requestAnimationFrame(() => {
        viewportFrameRef.current = null;
        const pendingViewport = pendingViewportRef.current;
        pendingViewportRef.current = null;

        if (pendingViewport) renderViewportWithoutReact(pendingViewport);
      });
    },
    [renderViewportWithoutReact],
  );

  const flushPendingViewport = useCallback(() => {
    if (viewportFrameRef.current !== null) {
      cancelAnimationFrame(viewportFrameRef.current);
      viewportFrameRef.current = null;
    }

    const pendingViewport = pendingViewportRef.current;
    pendingViewportRef.current = null;

    if (pendingViewport) {
      if (directDragRendering) {
        renderViewportWithoutReact(pendingViewport);
      } else {
        setNextViewport(pendingViewport);
      }
    }
  }, [directDragRendering, renderViewportWithoutReact, setNextViewport]);

  const getPoint = useCallback((event: PointerEvent<SVGSVGElement>): Point => {
    const bounds = pointerBoundsRef.current ?? event.currentTarget.getBoundingClientRect();

    return {
      x: (event.clientX - bounds.left) / bounds.width,
      y: (event.clientY - bounds.top) / bounds.height,
    };
  }, []);

  const startPan = useCallback(
    (point: Point) => {
      const gesture: PanGesture = {
        kind: "pan",
        startViewport: getCurrentViewport(),
        startPoint: point,
        hasMoved: false,
      };

      gestureRef.current = gesture;
    },
    [getCurrentViewport],
  );

  const startPinch = useCallback(
    (first: Point, second: Point) => {
      const gesture: PinchGesture = {
        kind: "pinch",
        startViewport: getCurrentViewport(),
        startDistance: getDistance(first, second),
        startMidpoint: getMidpoint(first, second),
        hasMoved: false,
      };

      gestureRef.current = gesture;
    },
    [getCurrentViewport],
  );

  const changeZoom = useCallback(
    (factor: number) => {
      const current = getCurrentViewport();
      const center = { x: 0.5, y: 0.5 };
      const zoom = Math.min(Math.max(current.zoom * factor, VENUE_MAP_MIN_ZOOM), maxZoom);

      setNextViewport(zoomAt(current, center, center, zoom, width, height));
    },
    [getCurrentViewport, height, maxZoom, setNextViewport, width],
  );

  const handlePointerDown = useCallback(
    (event: PointerEvent<SVGSVGElement>) => {
      if (event.pointerType === "mouse" && event.button !== 0) return;

      pointerBoundsRef.current = event.currentTarget.getBoundingClientRect();
      const point = getPoint(event);
      pointersRef.current.set(event.pointerId, point);

      if (pointersRef.current.size >= 2) {
        for (const pointerId of pointersRef.current.keys()) {
          event.currentTarget.setPointerCapture(pointerId);
        }
        const [first, second] = [...pointersRef.current.values()];

        startPinch(first!, second!);
        return;
      }

      startPan(point);
    },
    [getPoint, startPan, startPinch],
  );

  const handlePointerMove = useCallback(
    (event: PointerEvent<SVGSVGElement>) => {
      if (!pointersRef.current.has(event.pointerId)) return;

      pointersRef.current.set(event.pointerId, getPoint(event));

      if (pointersRef.current.size >= 2) {
        const gesture = gestureRef.current as PinchGesture;
        const [first, second] = [...pointersRef.current.values()];
        const zoom = Math.min(
          Math.max(gesture.startViewport.zoom * (getDistance(first!, second!) / gesture.startDistance), VENUE_MAP_MIN_ZOOM),
          maxZoom,
        );

        gesture.hasMoved = true;
        setDraggingVisual(true);
        if (trackDragging) setIsDragging(true);

        const nextViewport = zoomAt(gesture.startViewport, gesture.startMidpoint, getMidpoint(first!, second!), zoom, width, height);
        if (directDragRendering) {
          renderViewportWithoutReact(nextViewport);
        } else {
          setNextViewport(nextViewport);
        }
        return;
      }

      const gesture = gestureRef.current;
      if (!gesture || gesture.kind !== "pan") return;

      const point = getPoint(event);
      if (getDistance(gesture.startPoint, point) < VENUE_MAP_DRAG_THRESHOLD) return;

      event.currentTarget.setPointerCapture(event.pointerId);
      const viewWidth = width / gesture.startViewport.zoom;
      const viewHeight = height / gesture.startViewport.zoom;

      const nextViewport = {
        zoom: gesture.startViewport.zoom,
        centerX: gesture.startViewport.centerX + (gesture.startPoint.x - point.x) * viewWidth,
        centerY: gesture.startViewport.centerY + (gesture.startPoint.y - point.y) * viewHeight,
      };
      const wasAlreadyMoving = gesture.hasMoved;

      gesture.hasMoved = true;
      setDraggingVisual(true);
      if (trackDragging) setIsDragging(true);
      if (directDragRendering && wasAlreadyMoving) {
        scheduleViewportUpdate(nextViewport);
      } else if (directDragRendering) {
        renderViewportWithoutReact(nextViewport);
      } else {
        setNextViewport(nextViewport);
      }
    },
    [
      directDragRendering,
      getPoint,
      height,
      maxZoom,
      renderViewportWithoutReact,
      scheduleViewportUpdate,
      setDraggingVisual,
      setNextViewport,
      trackDragging,
      width,
    ],
  );

  const finishPointerGesture = useCallback(
    (pointerId: number) => {
      if (!pointersRef.current.has(pointerId)) return;

      const gesture = gestureRef.current;
      flushPendingViewport();

      if (gesture?.hasMoved) {
        ignoreSeatClickRef.current = true;
        window.setTimeout(() => {
          ignoreSeatClickRef.current = false;
        }, 0);
        if (directDragRendering) setViewport(viewportRef.current);
      }

      pointersRef.current.delete(pointerId);

      if (pointersRef.current.size === 1 && getCurrentViewport().zoom > VENUE_MAP_MIN_ZOOM) {
        startPan([...pointersRef.current.values()][0]);
      } else {
        gestureRef.current = null;
      }

      setDraggingVisual(false);
      if (trackDragging) setIsDragging(false);
    },
    [directDragRendering, flushPendingViewport, getCurrentViewport, setDraggingVisual, startPan, trackDragging],
  );

  const handlePointerUp = useCallback(
    (event: PointerEvent<SVGSVGElement>) => {
      finishPointerGesture(event.pointerId);
    },
    [finishPointerGesture],
  );

  useEffect(() => {
    const handleWindowPointerEnd = (event: globalThis.PointerEvent) => {
      finishPointerGesture(event.pointerId);
    };

    window.addEventListener("pointerup", handleWindowPointerEnd);
    window.addEventListener("pointercancel", handleWindowPointerEnd);

    return () => {
      window.removeEventListener("pointerup", handleWindowPointerEnd);
      window.removeEventListener("pointercancel", handleWindowPointerEnd);
    };
  }, [finishPointerGesture]);

  useEffect(
    () => () => {
      if (viewportFrameRef.current !== null) {
        cancelAnimationFrame(viewportFrameRef.current);
      }
    },
    [],
  );

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
        maxZoom,
      );

      setNextViewport(zoomAt(current, point, point, zoom, width, height));
    },
    [getCurrentViewport, height, maxZoom, setNextViewport, width],
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

  const consumeSeatClick = useCallback(() => {
    const shouldIgnore = ignoreSeatClickRef.current;
    ignoreSeatClickRef.current = false;

    return shouldIgnore;
  }, []);

  const viewBox = useMemo(() => {
    return createViewportViewBox(viewport, width, height);
  }, [height, viewport, width]);

  const zoomIn = useCallback(() => changeZoom(VENUE_MAP_ZOOM_FACTOR), [changeZoom]);
  const zoomOut = useCallback(() => changeZoom(1 / VENUE_MAP_ZOOM_FACTOR), [changeZoom]);

  return useMemo(
    () => ({
      mapRef,
      svgRef,
      viewBox,
      zoom: viewport.zoom,
      isDragging,
      canZoomIn: viewport.zoom < maxZoom,
      canZoomOut: viewport.zoom > VENUE_MAP_MIN_ZOOM,
      zoomIn,
      zoomOut,
      consumeSeatClick,
      handlePointerDown,
      handlePointerMove,
      handlePointerUp,
    }),
    [consumeSeatClick, handlePointerDown, handlePointerMove, handlePointerUp, isDragging, maxZoom, viewBox, viewport.zoom, zoomIn, zoomOut],
  );
};
