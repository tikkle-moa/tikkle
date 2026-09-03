import {
  type Dispatch,
  type KeyboardEvent,
  type PointerEvent,
  type RefObject,
  type SetStateAction,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import { type CreateVenueRequest, VENUE_SEAT_HEIGHT, VENUE_SEAT_WIDTH } from "@entities/venue";

import type { VenueFormErrors, VenueFormSeat } from "./venue-form.types";
import { replaceVenueSeatCollisionErrors } from "./venue-form.utils";
import {
  DOUBLE_CLICK_DELAY_MS,
  VENUE_LAYOUT_ASPECT_RATIO,
  VENUE_LAYOUT_MIN_VISIBLE_SIZE,
  VENUE_LAYOUT_MIN_ZOOM,
  VENUE_LAYOUT_WHEEL_ZOOM_FACTOR,
  VENUE_LAYOUT_ZOOM_FACTOR,
} from "./venue-layout.constants";
import type { VenueLayoutDragState } from "./venue-layout.types";
import { getVenueSeatCollisionMap } from "./venue-seat-collision.utils";

interface UseVenueLayoutInteractionProps {
  venue: CreateVenueRequest;
  venueSeats: VenueFormSeat[];
  selectedSeatClientIdSet: Set<number>;
  collisionMapRef: RefObject<Map<number, Set<number>>>;
  isSubmitting: boolean;
  setVenue: Dispatch<SetStateAction<CreateVenueRequest>>;
  setVenueSeats: Dispatch<SetStateAction<VenueFormSeat[]>>;
  setErrors: Dispatch<SetStateAction<VenueFormErrors>>;
  setSelectedSeatClientIds: Dispatch<SetStateAction<number[]>>;
  onLayoutChangeStart: () => void;
}

export const useVenueLayoutInteraction = ({
  venue,
  venueSeats,
  selectedSeatClientIdSet,
  collisionMapRef,
  isSubmitting,
  setVenue,
  setVenueSeats,
  setErrors,
  setSelectedSeatClientIds,
  onLayoutChangeStart,
}: UseVenueLayoutInteractionProps) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const lastSeatPointerDownRef = useRef<{ clientId: number; time: number } | null>(null);
  const panPointerRef = useRef<{ clientX: number; clientY: number; distance: number } | null>(null);
  const panFrameRef = useRef<number | null>(null);
  const pendingPanDeltaRef = useRef({ x: 0, y: 0 });
  const selectFrameRef = useRef<number | null>(null);
  const pendingSelectionPointRef = useRef<{ x: number; y: number } | null>(null);
  const wheelFrameRef = useRef<number | null>(null);
  const pendingWheelStepsRef = useRef(0);
  const startSeatDragRef = useRef<((event: PointerEvent<SVGElement>, clientId: number) => void) | null>(null);

  const [dragState, setDragState] = useState<VenueLayoutDragState | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isAltPressed, setIsAltPressed] = useState(false);

  const safeWidth = Math.max(venue.width, 1);
  const safeHeight = Math.max(venue.height, 1);
  const baseViewWidth = Math.min(safeWidth, safeHeight * VENUE_LAYOUT_ASPECT_RATIO);
  const baseViewHeight = baseViewWidth / VENUE_LAYOUT_ASPECT_RATIO;
  const viewWidth = baseViewWidth / zoom;
  const viewHeight = baseViewHeight / zoom;
  const maxZoom = Math.max(
    VENUE_LAYOUT_MIN_ZOOM,
    Math.min(baseViewWidth / VENUE_LAYOUT_MIN_VISIBLE_SIZE, baseViewHeight / VENUE_LAYOUT_MIN_VISIBLE_SIZE),
  );

  const applyZoom = useCallback(
    (nextZoom: number) => {
      const resolvedZoom = Math.min(Math.max(nextZoom, VENUE_LAYOUT_MIN_ZOOM), maxZoom);

      const centerX = pan.x + viewWidth / 2;
      const centerY = pan.y + viewHeight / 2;
      const nextWidth = baseViewWidth / resolvedZoom;
      const nextHeight = baseViewHeight / resolvedZoom;
      setZoom(resolvedZoom);
      setPan({
        x: Math.min(Math.max(centerX - nextWidth / 2, 0), safeWidth - nextWidth),
        y: Math.min(Math.max(centerY - nextHeight / 2, 0), safeHeight - nextHeight),
      });
    },
    [baseViewHeight, baseViewWidth, maxZoom, pan.x, pan.y, safeHeight, safeWidth, viewHeight, viewWidth],
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
      pendingWheelStepsRef.current += event.deltaY < 0 ? 1 : -1;
      if (wheelFrameRef.current !== null) return;

      wheelFrameRef.current = requestAnimationFrame(() => {
        wheelFrameRef.current = null;
        const wheelSteps = pendingWheelStepsRef.current;
        pendingWheelStepsRef.current = 0;
        applyZoom(zoom * VENUE_LAYOUT_WHEEL_ZOOM_FACTOR ** wheelSteps);
      });
    };
    svg.addEventListener("wheel", handleWheel, { passive: false });
    return () => svg.removeEventListener("wheel", handleWheel);
  }, [applyZoom, isSubmitting, zoom]);

  useEffect(() => {
    return () => {
      if (panFrameRef.current !== null) cancelAnimationFrame(panFrameRef.current);
      if (selectFrameRef.current !== null) cancelAnimationFrame(selectFrameRef.current);
      if (wheelFrameRef.current !== null) cancelAnimationFrame(wheelFrameRef.current);
    };
  }, []);

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
      setSelectedSeatClientIds([]);
    }
  };

  const capturePointer = (event: PointerEvent<SVGElement>) => {
    event.preventDefault();
    event.stopPropagation();
    svgRef.current?.focus();
    svgRef.current?.setPointerCapture(event.pointerId);
  };

  const flushPan = () => {
    const delta = pendingPanDeltaRef.current;
    pendingPanDeltaRef.current = { x: 0, y: 0 };
    if (delta.x === 0 && delta.y === 0) return;

    setPan((current) => ({
      x: Math.min(Math.max(current.x - delta.x, 0), safeWidth - viewWidth),
      y: Math.min(Math.max(current.y - delta.y, 0), safeHeight - viewHeight),
    }));
  };

  const handlePointerMove = (event: PointerEvent<SVGSVGElement>) => {
    if (!dragState || isSubmitting) return;
    if (dragState.type === "pan") {
      const pointer = panPointerRef.current;
      if (!pointer) return;

      const bounds = event.currentTarget.getBoundingClientRect();
      const pixelsPerUnit = Math.min(bounds.width / viewWidth, bounds.height / viewHeight);
      const clientDeltaX = event.clientX - pointer.clientX;
      const clientDeltaY = event.clientY - pointer.clientY;
      const deltaX = clientDeltaX / pixelsPerUnit;
      const deltaY = clientDeltaY / pixelsPerUnit;
      pendingPanDeltaRef.current.x += deltaX;
      pendingPanDeltaRef.current.y += deltaY;
      if (panFrameRef.current === null) {
        panFrameRef.current = requestAnimationFrame(() => {
          panFrameRef.current = null;
          flushPan();
        });
      }

      pointer.clientX = event.clientX;
      pointer.clientY = event.clientY;
      pointer.distance += Math.hypot(clientDeltaX, clientDeltaY);
      if (!dragState.moved && pointer.distance > 3) setDragState({ ...dragState, moved: true });
      return;
    }

    const point = getCoordinates(event);
    if (dragState.type === "select") {
      pendingSelectionPointRef.current = point;
      if (selectFrameRef.current === null) {
        selectFrameRef.current = requestAnimationFrame(() => {
          selectFrameRef.current = null;
          const selectionPoint = pendingSelectionPointRef.current;
          pendingSelectionPointRef.current = null;
          if (!selectionPoint) return;
          setDragState((current) => (current?.type === "select" ? { ...current, currentX: selectionPoint.x, currentY: selectionPoint.y } : current));
        });
      }
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
      return;
    }

    const viewportLeft = pan.x;
    const viewportRight = pan.x + viewWidth;
    const viewportTop = pan.y;
    const viewportBottom = pan.y + viewHeight;
    const minDeltaX = Math.max(...dragState.origins.map((seat) => viewportLeft + VENUE_SEAT_WIDTH / 2 - seat.positionX));
    const maxDeltaX = Math.min(...dragState.origins.map((seat) => viewportRight - VENUE_SEAT_WIDTH / 2 - seat.positionX));
    const minDeltaY = Math.max(...dragState.origins.map((seat) => viewportTop + VENUE_SEAT_HEIGHT / 2 - seat.positionY));
    const maxDeltaY = Math.min(...dragState.origins.map((seat) => viewportBottom - VENUE_SEAT_HEIGHT / 2 - seat.positionY));

    if (minDeltaX <= maxDeltaX) {
      deltaX = Math.min(Math.max(deltaX, minDeltaX), maxDeltaX);
    } else {
      const venueMinDeltaX = Math.max(...dragState.origins.map((seat) => VENUE_SEAT_WIDTH / 2 - seat.positionX));
      const venueMaxDeltaX = Math.min(...dragState.origins.map((seat) => safeWidth - VENUE_SEAT_WIDTH / 2 - seat.positionX));
      deltaX = Math.min(Math.max(deltaX, venueMinDeltaX), venueMaxDeltaX);
    }
    if (minDeltaY <= maxDeltaY) {
      deltaY = Math.min(Math.max(deltaY, minDeltaY), maxDeltaY);
    } else {
      const venueMinDeltaY = Math.max(...dragState.origins.map((seat) => VENUE_SEAT_HEIGHT / 2 - seat.positionY));
      const venueMaxDeltaY = Math.min(...dragState.origins.map((seat) => safeHeight - VENUE_SEAT_HEIGHT / 2 - seat.positionY));
      deltaY = Math.min(Math.max(deltaY, venueMinDeltaY), venueMaxDeltaY);
    }
    const positionMap = new Map(
      dragState.origins.map(({ clientId, positionX, positionY }) => [
        clientId,
        { positionX: Math.round((positionX + deltaX) * 100) / 100, positionY: Math.round((positionY + deltaY) * 100) / 100 },
      ]),
    );
    const nextVenueSeats = venueSeats.map((seat) => {
      const nextPosition = positionMap.get(seat.clientId);
      return nextPosition ? { ...seat, ...nextPosition } : seat;
    });

    setVenueSeats(nextVenueSeats);
    setErrors((current) => {
      const collisionMap = getVenueSeatCollisionMap(venue, nextVenueSeats, {
        currentCollisionMap: collisionMapRef.current,
        targetClientIds: [...positionMap.keys()],
      });
      collisionMapRef.current = collisionMap;
      const next = replaceVenueSeatCollisionErrors(current, nextVenueSeats, collisionMap);
      const nextEntries = Object.entries(next);
      const isSame = nextEntries.length === Object.keys(current).length && nextEntries.every(([key, message]) => current[key] === message);
      return isSame ? current : next;
    });
  };

  const startBackgroundDrag = (event: PointerEvent<SVGRectElement>) => {
    if (isSubmitting) return;
    if (!event.altKey && event.button !== 1) {
      const point = getCoordinates(event);
      const targetSeat = venueSeats.findLast(
        (seat) => Math.abs(seat.positionX - point.x) <= VENUE_SEAT_WIDTH / 2 && Math.abs(seat.positionY - point.y) <= VENUE_SEAT_HEIGHT / 2,
      );
      if (targetSeat) {
        startSeatDragRef.current?.(event, targetSeat.clientId);
        return;
      }
    }
    capturePointer(event);
    if (!event.altKey || event.button === 1) {
      panPointerRef.current = { clientX: event.clientX, clientY: event.clientY, distance: 0 };
      setDragState({ type: "pan", moved: false });
      return;
    }
    const point = getCoordinates(event);
    setDragState({
      type: "select",
      startX: point.x,
      startY: point.y,
      currentX: point.x,
      currentY: point.y,
      additive: event.shiftKey,
      baseClientIds: event.shiftKey ? [...selectedSeatClientIdSet] : [],
    });
  };

  const startStageDrag = (event: PointerEvent<SVGElement>) => {
    if (isSubmitting) return;
    capturePointer(event);
    onLayoutChangeStart();
    const point = getCoordinates(event);
    setDragState({ type: "stage", pointerX: point.x, pointerY: point.y, originX: venue.stagePositionX, originY: venue.stagePositionY });
  };

  const startSeatDrag = useCallback(
    (event: PointerEvent<SVGElement>, clientId: number) => {
      if (isSubmitting) return;
      const previousPointerDown = lastSeatPointerDownRef.current;
      const isDoubleClick = previousPointerDown?.clientId === clientId && event.timeStamp - previousPointerDown.time <= DOUBLE_CLICK_DELAY_MS;
      lastSeatPointerDownRef.current = isDoubleClick ? null : { clientId, time: event.timeStamp };

      if (isDoubleClick) {
        event.preventDefault();
        event.stopPropagation();
        setDragState(null);
        const sectionName = venueSeats.find((seat) => seat.clientId === clientId)?.sectionName;
        if (sectionName === undefined) return;
        setSelectedSeatClientIds(venueSeats.flatMap((seat) => (seat.sectionName === sectionName ? [seat.clientId] : [])));
        return;
      }
      capturePointer(event);
      const additive = event.shiftKey;
      const movingClientIds = selectedSeatClientIdSet.has(clientId)
        ? [...selectedSeatClientIdSet]
        : additive
          ? [...selectedSeatClientIdSet, clientId]
          : [clientId];
      onLayoutChangeStart();
      if (!selectedSeatClientIdSet.has(clientId))
        setSelectedSeatClientIds((current) => {
          if (!additive) return [clientId];
          return current.includes(clientId) ? current.filter((selectedClientId) => selectedClientId !== clientId) : [...current, clientId];
        });
      const point = getCoordinates(event);
      const seatMap = new Map(venueSeats.map((seat) => [seat.clientId, seat]));
      setDragState({
        type: "seats",
        pointerX: point.x,
        pointerY: point.y,
        origins: [...new Set(movingClientIds)].map((clientId) => {
          const seat = seatMap.get(clientId);
          if (!seat) throw new Error(`Seat with clientId ${clientId} not found`);
          return {
            clientId,
            positionX: seat.positionX,
            positionY: seat.positionY,
          };
        }),
      });
    },
    [getCoordinates, isSubmitting, onLayoutChangeStart, selectedSeatClientIdSet, setSelectedSeatClientIds, venueSeats],
  );

  useEffect(() => {
    startSeatDragRef.current = startSeatDrag;
  }, [startSeatDrag]);

  const startSelectedAreaDrag = (event: PointerEvent<SVGRectElement>) => {
    if (isSubmitting || selectedSeatClientIdSet.size === 0) return;
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
      origins: [...selectedSeatClientIdSet].map((clientId) => ({
        clientId,
        positionX: venueSeats.find((seat) => seat.clientId === clientId)!.positionX,
        positionY: venueSeats.find((seat) => seat.clientId === clientId)!.positionY,
      })),
    });
  };

  const finishDrag = (event?: PointerEvent<SVGSVGElement>) => {
    if (panFrameRef.current !== null) {
      cancelAnimationFrame(panFrameRef.current);
      panFrameRef.current = null;
      flushPan();
    }
    if (selectFrameRef.current !== null) {
      cancelAnimationFrame(selectFrameRef.current);
      selectFrameRef.current = null;
    }
    if (dragState?.type === "select") {
      const point = event ? getCoordinates(event) : pendingSelectionPointRef.current;
      const currentX = point?.x ?? dragState.currentX;
      const currentY = point?.y ?? dragState.currentY;
      const left = Math.min(dragState.startX, currentX);
      const right = Math.max(dragState.startX, currentX);
      const top = Math.min(dragState.startY, currentY);
      const bottom = Math.max(dragState.startY, currentY);
      const enclosedClientIds: number[] = [];

      venueSeats.forEach((seat) => {
        if (seat.positionX >= left && seat.positionX <= right && seat.positionY >= top && seat.positionY <= bottom) {
          enclosedClientIds.push(seat.clientId);
        }
      });

      setSelectedSeatClientIds(dragState.additive ? [...new Set([...dragState.baseClientIds, ...enclosedClientIds])] : enclosedClientIds);
    }
    pendingSelectionPointRef.current = null;
    if (dragState?.type === "pan" && !dragState.moved) setSelectedSeatClientIds([]);
    panPointerRef.current = null;
    setDragState(null);
  };

  const handlePointerDown = useCallback((event: PointerEvent<SVGGElement>) => {
    const seatElement = (event.target as Element).closest<SVGGElement>("[data-seat-client-id]");
    if (!seatElement) return;

    const clientId = Number(seatElement.dataset.seatClientId);
    if (!Number.isFinite(clientId)) return;

    startSeatDragRef.current?.(event, clientId);
  }, []);

  return {
    viewWidth,
    viewHeight,
    svgRef,
    dragState,
    zoom,
    maxZoom,
    pan,
    isAltPressed,
    applyZoom,
    resetView,
    handleKeyDown,
    handlePointerDown,
    handlePointerMove,
    startStageDrag,
    startSelectedAreaDrag,
    startBackgroundDrag,
    finishDrag,
  };
};
