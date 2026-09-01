import { type Dispatch, type KeyboardEvent, type PointerEvent, type SetStateAction, useCallback, useEffect, useRef, useState } from "react";

import type { CreateVenueRequest, CreateVenueSeatRequest } from "@entities/venue";

import type { VenueFormErrors } from "./venue-form.types";
import {
  VENUE_LAYOUT_MIN_VISIBLE_SIZE,
  VENUE_LAYOUT_MIN_ZOOM,
  VENUE_LAYOUT_WHEEL_ZOOM_FACTOR,
  VENUE_LAYOUT_ZOOM_FACTOR,
} from "./venue-layout.constants";
import type { VenueLayoutDragState } from "./venue-layout.types";

const DOUBLE_CLICK_DELAY_MS = 350;

interface UseVenueLayoutInteractionProps {
  venue: CreateVenueRequest;
  venueSeats: CreateVenueSeatRequest[];
  selectedSeatIndices: number[];
  isSubmitting: boolean;
  setVenue: Dispatch<SetStateAction<CreateVenueRequest>>;
  setVenueSeats: Dispatch<SetStateAction<CreateVenueSeatRequest[]>>;
  setErrors: Dispatch<SetStateAction<VenueFormErrors>>;
  setSelectedSeatIndices: Dispatch<SetStateAction<number[]>>;
  onLayoutChangeStart: () => void;
}

export const useVenueLayoutInteraction = ({
  venue,
  venueSeats,
  selectedSeatIndices,
  isSubmitting,
  setVenue,
  setVenueSeats,
  setErrors,
  setSelectedSeatIndices,
  onLayoutChangeStart,
}: UseVenueLayoutInteractionProps) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const lastSeatPointerDownRef = useRef<{ index: number; time: number } | null>(null);
  const [dragState, setDragState] = useState<VenueLayoutDragState | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isAltPressed, setIsAltPressed] = useState(false);

  const selectedSet = new Set(selectedSeatIndices);
  const safeWidth = Math.max(venue.width, 1);
  const safeHeight = Math.max(venue.height, 1);
  const viewWidth = safeWidth / zoom;
  const viewHeight = safeHeight / zoom;
  const maxZoom = Math.max(safeWidth / VENUE_LAYOUT_MIN_VISIBLE_SIZE, safeHeight / VENUE_LAYOUT_MIN_VISIBLE_SIZE);

  const applyZoom = useCallback(
    (nextZoom: number) => {
      const resolvedZoom = Math.min(Math.max(nextZoom, VENUE_LAYOUT_MIN_ZOOM), maxZoom);

      const centerX = pan.x + viewWidth / 2;
      const centerY = pan.y + viewHeight / 2;
      const nextWidth = safeWidth / resolvedZoom;
      const nextHeight = safeHeight / resolvedZoom;
      setZoom(resolvedZoom);
      setPan({
        x: Math.min(Math.max(centerX - nextWidth / 2, 0), safeWidth - nextWidth),
        y: Math.min(Math.max(centerY - nextHeight / 2, 0), safeHeight - nextHeight),
      });
    },
    [maxZoom, pan.x, pan.y, safeHeight, safeWidth, viewHeight, viewWidth],
  );

  const resetView = useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, []);

  const getCoordinates = useCallback((event: PointerEvent<SVGSVGElement | SVGElement>) => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const point = svg.createSVGPoint();
    point.x = event.clientX;
    point.y = event.clientY;
    const matrix = svg.getScreenCTM();
    if (!matrix) return { x: 0, y: 0 };
    const transformed = point.matrixTransform(matrix.inverse());
    return { x: transformed.x, y: transformed.y };
  }, []);

  useEffect(() => {
    if (!dragState) return;
    const previousOverflow = document.body.style.overflow;
    const previousUserSelect = document.body.style.userSelect;
    document.body.style.overflow = "hidden";
    document.body.style.userSelect = "none";
    return () => {
      document.body.style.overflow = previousOverflow;
      document.body.style.userSelect = previousUserSelect;
    };
  }, [dragState]);

  useEffect(() => {
    const handleKeyDown = (event: globalThis.KeyboardEvent) => event.key === "Alt" && setIsAltPressed(true);
    const handleKeyUp = (event: globalThis.KeyboardEvent) => event.key === "Alt" && setIsAltPressed(false);
    const handleBlur = () => setIsAltPressed(false);
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("blur", handleBlur);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("blur", handleBlur);
    };
  }, []);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const handleWheel = (event: globalThis.WheelEvent) => {
      if (isSubmitting || !event.altKey) return;
      event.preventDefault();
      event.stopPropagation();
      applyZoom(event.deltaY < 0 ? zoom * VENUE_LAYOUT_WHEEL_ZOOM_FACTOR : zoom / VENUE_LAYOUT_WHEEL_ZOOM_FACTOR);
    };
    svg.addEventListener("wheel", handleWheel, { passive: false });
    return () => svg.removeEventListener("wheel", handleWheel);
  }, [applyZoom, isSubmitting, zoom]);

  const handleKeyDown = (event: KeyboardEvent<SVGSVGElement>) => {
    const modifier = event.metaKey || event.ctrlKey;
    if ((modifier && (event.key === "+" || event.key === "=")) || event.key === "+") {
      event.preventDefault();
      applyZoom(zoom * VENUE_LAYOUT_ZOOM_FACTOR);
    } else if ((modifier && event.key === "-") || event.key === "-") {
      event.preventDefault();
      applyZoom(zoom / VENUE_LAYOUT_ZOOM_FACTOR);
    } else if (modifier && event.key === "0") {
      event.preventDefault();
      resetView();
    } else if (event.key === "Escape") {
      setSelectedSeatIndices([]);
    }
  };

  const capturePointer = (event: PointerEvent<SVGElement>) => {
    event.preventDefault();
    event.stopPropagation();
    svgRef.current?.focus();
    svgRef.current?.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: PointerEvent<SVGSVGElement>) => {
    if (!dragState || isSubmitting) return;
    if (dragState.type === "pan") {
      const bounds = event.currentTarget.getBoundingClientRect();
      const deltaX = ((event.clientX - dragState.clientX) / bounds.width) * viewWidth;
      const deltaY = ((event.clientY - dragState.clientY) / bounds.height) * viewHeight;
      setPan({
        x: Math.min(Math.max(dragState.originX - deltaX, 0), safeWidth - viewWidth),
        y: Math.min(Math.max(dragState.originY - deltaY, 0), safeHeight - viewHeight),
      });
      if (!dragState.moved && Math.hypot(event.clientX - dragState.clientX, event.clientY - dragState.clientY) > 3) {
        setDragState({ ...dragState, moved: true });
      }
      return;
    }

    const point = getCoordinates(event);
    if (dragState.type === "select") {
      const left = Math.min(dragState.startX, point.x);
      const right = Math.max(dragState.startX, point.x);
      const top = Math.min(dragState.startY, point.y);
      const bottom = Math.max(dragState.startY, point.y);
      const enclosed = venueSeats.flatMap((seat, index) =>
        seat.positionX >= left && seat.positionX <= right && seat.positionY >= top && seat.positionY <= bottom ? [index] : [],
      );
      setSelectedSeatIndices(dragState.additive ? [...new Set([...dragState.baseIndices, ...enclosed])] : enclosed);
      setDragState({ ...dragState, currentX: point.x, currentY: point.y });
      return;
    }

    let deltaX = point.x - dragState.pointerX;
    let deltaY = point.y - dragState.pointerY;
    if (dragState.type === "stage") {
      const halfWidth = Math.min(venue.stageWidth / 2, safeWidth / 2);
      const halfHeight = Math.min(venue.stageHeight / 2, safeHeight / 2);
      setVenue((current) => ({
        ...current,
        stagePositionX: Math.min(Math.max(dragState.originX + deltaX, halfWidth), safeWidth - halfWidth),
        stagePositionY: Math.min(Math.max(dragState.originY + deltaY, halfHeight), safeHeight - halfHeight),
      }));
      setErrors((current) => ({ ...current, stagePositionX: "", stagePositionY: "" }));
      return;
    }

    deltaX = Math.min(
      Math.max(deltaX, Math.max(...dragState.origins.map((seat) => -seat.positionX))),
      Math.min(...dragState.origins.map((seat) => safeWidth - seat.positionX)),
    );
    deltaY = Math.min(
      Math.max(deltaY, Math.max(...dragState.origins.map((seat) => -seat.positionY))),
      Math.min(...dragState.origins.map((seat) => safeHeight - seat.positionY)),
    );
    const positionMap = new Map(
      dragState.origins.map(({ index, positionX, positionY }) => [
        index,
        { positionX: Math.round((positionX + deltaX) * 100) / 100, positionY: Math.round((positionY + deltaY) * 100) / 100 },
      ]),
    );
    setVenueSeats((current) => current.map((seat, index) => ({ ...seat, ...positionMap.get(index) })));
    setErrors((current) => {
      const next = { ...current };
      dragState.origins.forEach(({ index }) => {
        next[`seat.${index}.positionX`] = "";
        next[`seat.${index}.positionY`] = "";
      });
      return next;
    });
  };

  const startBackgroundDrag = (event: PointerEvent<SVGRectElement>) => {
    if (isSubmitting) return;
    capturePointer(event);
    if (!event.altKey || event.button === 1) {
      setDragState({ type: "pan", clientX: event.clientX, clientY: event.clientY, originX: pan.x, originY: pan.y, moved: false });
      return;
    }
    const point = getCoordinates(event);
    if (!event.shiftKey) setSelectedSeatIndices([]);
    setDragState({
      type: "select",
      startX: point.x,
      startY: point.y,
      currentX: point.x,
      currentY: point.y,
      additive: event.shiftKey,
      baseIndices: event.shiftKey ? selectedSeatIndices : [],
    });
  };

  const startStageDrag = (event: PointerEvent<SVGElement>) => {
    if (isSubmitting) return;
    capturePointer(event);
    onLayoutChangeStart();
    const point = getCoordinates(event);
    setDragState({ type: "stage", pointerX: point.x, pointerY: point.y, originX: venue.stagePositionX, originY: venue.stagePositionY });
  };

  const startSeatDrag = (event: PointerEvent<SVGElement>, index: number) => {
    if (isSubmitting) return;
    const previousPointerDown = lastSeatPointerDownRef.current;
    const isDoubleClick = previousPointerDown?.index === index && event.timeStamp - previousPointerDown.time <= DOUBLE_CLICK_DELAY_MS;
    lastSeatPointerDownRef.current = isDoubleClick ? null : { index, time: event.timeStamp };

    if (isDoubleClick) {
      event.preventDefault();
      event.stopPropagation();
      setDragState(null);
      const sectionName = venueSeats[index]?.sectionName;
      if (sectionName === undefined) return;
      setSelectedSeatIndices(venueSeats.flatMap((seat, i) => (seat.sectionName === sectionName ? [i] : [])));
      return;
    }
    capturePointer(event);
    const additive = event.shiftKey;
    const movingIndices = selectedSet.has(index) ? selectedSeatIndices : additive ? [...selectedSeatIndices, index] : [index];
    onLayoutChangeStart();
    if (!selectedSet.has(index))
      setSelectedSeatIndices((current) => {
        if (!additive) return [index];
        return current.includes(index) ? current.filter((selectedIndex) => selectedIndex !== index) : [...current, index];
      });
    const point = getCoordinates(event);
    setDragState({
      type: "seats",
      pointerX: point.x,
      pointerY: point.y,
      origins: [...new Set(movingIndices)].map((seatIndex) => ({
        index: seatIndex,
        positionX: venueSeats[seatIndex].positionX,
        positionY: venueSeats[seatIndex].positionY,
      })),
    });
  };

  const startSelectedAreaDrag = (event: PointerEvent<SVGRectElement>) => {
    if (isSubmitting || selectedSeatIndices.length === 0) return;
    if (event.altKey) {
      startBackgroundDrag(event);
      return;
    }
    capturePointer(event);
    onLayoutChangeStart();
    const point = getCoordinates(event);
    setDragState({
      type: "seats",
      pointerX: point.x,
      pointerY: point.y,
      origins: selectedSeatIndices.map((index) => ({ index, positionX: venueSeats[index].positionX, positionY: venueSeats[index].positionY })),
    });
  };

  const finishDrag = () => {
    if (dragState?.type === "pan" && !dragState.moved) setSelectedSeatIndices([]);
    setDragState(null);
  };

  return {
    svgRef,
    dragState,
    zoom,
    maxZoom,
    pan,
    isAltPressed,
    applyZoom,
    resetView,
    handleKeyDown,
    handlePointerMove,
    startStageDrag,
    startSeatDrag,
    startSelectedAreaDrag,
    startBackgroundDrag,
    finishDrag,
  };
};
