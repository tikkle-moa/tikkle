import { type PointerEvent, type RefObject, useCallback, useLayoutEffect, useRef, useState } from "react";

import { type VenueSeatResponse, type VenueSeatState } from "@entities/venue";

import type { DragSelectionArea, DragSelectionState } from "./venue-map-drag.types";

interface UseVenueMapDragSelectionProps {
  svgRef: RefObject<SVGSVGElement | null>;
  venueSeats: VenueSeatResponse[];
  venueSeatStates?: ReadonlyMap<number, VenueSeatState>;
  selectedSeatIds?: ReadonlySet<number>;
  enabled: boolean;
  onSeatSelectionChange?: (seatIds: ReadonlySet<number>) => void;
}

export const useVenueMapDragSelection = ({
  svgRef,
  venueSeats,
  venueSeatStates,
  selectedSeatIds,
  enabled,
  onSeatSelectionChange,
}: UseVenueMapDragSelectionProps) => {
  const [dragSelection, setDragSelection] = useState<DragSelectionState | null>(null);
  const dragSelectionRef = useRef<DragSelectionState | null>(null);
  const selectedSeatIdsRef = useRef<ReadonlySet<number>>(selectedSeatIds ?? new Set());
  const previewSelectedSeatIdsRef = useRef<ReadonlySet<number> | null>(null);
  const seatElementByIdRef = useRef(new Map<number, SVGGElement>());
  const ignoreSeatClickRef = useRef(false);

  const setNextDragSelection = useCallback((next: DragSelectionState | null) => {
    dragSelectionRef.current = next;
    setDragSelection(next);
  }, []);

  const getCoordinates = useCallback(
    (event: PointerEvent<SVGSVGElement>) => {
      const svg = svgRef.current;
      if (!svg) return null;

      const matrix = svg.getScreenCTM?.();
      if (matrix && svg.createSVGPoint) {
        const point = svg.createSVGPoint();
        point.x = event.clientX;
        point.y = event.clientY;
        const transformed = point.matrixTransform(matrix.inverse());
        return { x: transformed.x, y: transformed.y };
      }

      const bounds = svg.getBoundingClientRect();
      const [viewX, viewY, viewWidth, viewHeight] = (svg.getAttribute("viewBox") ?? "").split(/\s+/).map(Number);
      if (bounds.width === 0 || bounds.height === 0 || ![viewX, viewY, viewWidth, viewHeight].every(Number.isFinite)) return null;

      return {
        x: viewX! + ((event.clientX - bounds.left) / bounds.width) * viewWidth!,
        y: viewY! + ((event.clientY - bounds.top) / bounds.height) * viewHeight!,
      };
    },
    [svgRef],
  );

  const getEnclosedSeatIds = useCallback(
    (area: DragSelectionArea) => {
      const left = Math.min(area.startX, area.currentX);
      const right = Math.max(area.startX, area.currentX);
      const top = Math.min(area.startY, area.currentY);
      const bottom = Math.max(area.startY, area.currentY);

      return venueSeats.flatMap((seat) => {
        const status = venueSeatStates?.get(seat.id)?.status ?? "available";
        const isSelectable = status === "available" || status === "held_by_my_group";
        const isEnclosed = seat.positionX >= left && seat.positionX <= right && seat.positionY >= top && seat.positionY <= bottom;

        return isSelectable && isEnclosed ? [seat.id] : [];
      });
    },
    [venueSeatStates, venueSeats],
  );

  const getSelectedSeatIds = useCallback(
    (selection: DragSelectionState): ReadonlySet<number> => {
      const enclosedSeatIds = getEnclosedSeatIds(selection);
      return new Set(selection.additive ? [...selection.baseSeatIds, ...enclosedSeatIds] : enclosedSeatIds);
    },
    [getEnclosedSeatIds],
  );

  const renderSelectionPreview = useCallback(
    (nextSelectedSeatIds: ReadonlySet<number>) => {
      const previousSelectedSeatIds = previewSelectedSeatIdsRef.current ?? selectedSeatIdsRef.current;
      const changedSeatIds = new Set<number>();
      const seatElementById = seatElementByIdRef.current;

      if (seatElementById.size === 0) {
        svgRef.current?.querySelectorAll<SVGGElement>("[data-seat-id]").forEach((element) => {
          const seatId = Number(element.dataset.seatId);
          if (Number.isFinite(seatId)) seatElementById.set(seatId, element);
        });
      }

      previousSelectedSeatIds.forEach((seatId) => {
        if (!nextSelectedSeatIds.has(seatId)) changedSeatIds.add(seatId);
      });
      nextSelectedSeatIds.forEach((seatId) => {
        if (!previousSelectedSeatIds.has(seatId)) changedSeatIds.add(seatId);
      });

      changedSeatIds.forEach((seatId) => {
        const seatElement = seatElementById.get(seatId);
        const isSelected = nextSelectedSeatIds.has(seatId);
        seatElement?.setAttribute("aria-pressed", String(isSelected));
        seatElement?.setAttribute("data-selected", String(isSelected));
      });
      previewSelectedSeatIdsRef.current = nextSelectedSeatIds;
    },
    [svgRef],
  );

  useLayoutEffect(() => {
    seatElementByIdRef.current.clear();
  }, [venueSeats]);

  useLayoutEffect(() => {
    if (selectedSeatIds === undefined || dragSelectionRef.current) return;

    renderSelectionPreview(selectedSeatIds);
    previewSelectedSeatIdsRef.current = null;
    selectedSeatIdsRef.current = selectedSeatIds;
  }, [renderSelectionPreview, selectedSeatIds]);

  const handlePointerDown = useCallback(
    (event: PointerEvent<SVGSVGElement>) => {
      if (!enabled || !event.altKey || event.button !== 0) return false;

      const point = getCoordinates(event);
      if (!point) return false;

      event.preventDefault();
      event.currentTarget.setPointerCapture(event.pointerId);
      setNextDragSelection({
        pointerId: event.pointerId,
        startX: point.x,
        startY: point.y,
        currentX: point.x,
        currentY: point.y,
        additive: event.shiftKey,
        baseSeatIds: event.shiftKey ? [...(selectedSeatIds ?? [])] : [],
        startedOnSeat: event.target instanceof Element && event.target.closest("[data-seat-id]") !== null,
      });
      previewSelectedSeatIdsRef.current = selectedSeatIdsRef.current;
      return true;
    },
    [enabled, getCoordinates, selectedSeatIds, setNextDragSelection],
  );

  const handlePointerMove = useCallback(
    (event: PointerEvent<SVGSVGElement>) => {
      const current = dragSelectionRef.current;
      if (!current || current.pointerId !== event.pointerId) return false;

      const point = getCoordinates(event);
      if (!point) return true;

      const next = { ...current, currentX: point.x, currentY: point.y };
      renderSelectionPreview(getSelectedSeatIds(next));
      setNextDragSelection(next);
      return true;
    },
    [getCoordinates, getSelectedSeatIds, renderSelectionPreview, setNextDragSelection],
  );

  const finishSelection = useCallback(
    (event: PointerEvent<SVGSVGElement>, commit: boolean) => {
      const current = dragSelectionRef.current;
      if (!current || current.pointerId !== event.pointerId) return false;

      const point = getCoordinates(event);
      const completed = point ? { ...current, currentX: point.x, currentY: point.y } : current;
      const completedSeatIds = commit ? getSelectedSeatIds(completed) : selectedSeatIdsRef.current;

      renderSelectionPreview(completedSeatIds);
      previewSelectedSeatIdsRef.current = null;
      setNextDragSelection(null);
      if (commit) {
        onSeatSelectionChange?.(completedSeatIds);
        ignoreSeatClickRef.current = completed.startedOnSeat;
        if (completed.startedOnSeat) {
          window.setTimeout(() => {
            ignoreSeatClickRef.current = false;
          }, 0);
        }
      }
      return true;
    },
    [getCoordinates, getSelectedSeatIds, onSeatSelectionChange, renderSelectionPreview, setNextDragSelection],
  );

  const consumeSeatClick = useCallback(() => {
    const shouldIgnore = ignoreSeatClickRef.current;
    ignoreSeatClickRef.current = false;
    return shouldIgnore;
  }, []);

  const handlePointerUp = useCallback((event: PointerEvent<SVGSVGElement>) => finishSelection(event, true), [finishSelection]);
  const handlePointerCancel = useCallback((event: PointerEvent<SVGSVGElement>) => finishSelection(event, false), [finishSelection]);

  return {
    dragSelection,
    consumeSeatClick,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handlePointerCancel,
  };
};
