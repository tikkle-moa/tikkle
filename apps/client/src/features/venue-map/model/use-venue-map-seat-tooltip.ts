import { type PointerEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";

import { type VenueSeatResponse, type VenueSeatState, isHeldSeatStatus } from "@entities/venue";

import type { TooltipPosition } from "./venue-map.types";

interface UseVenueMapSeatTooltipProps {
  venueSeats: VenueSeatResponse[];
  venueSeatStates?: ReadonlyMap<number, VenueSeatState>;
}

export const useVenueMapSeatTooltip = ({ venueSeats, venueSeatStates }: UseVenueMapSeatTooltipProps) => {
  const [activeSeatId, setActiveSeatId] = useState<number | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState<TooltipPosition | null>(null);
  const venueSeatStatesRef = useRef(venueSeatStates);

  useEffect(() => {
    venueSeatStatesRef.current = venueSeatStates;
  }, [venueSeatStates]);

  const seatById = useMemo(() => new Map(venueSeats.map((seat) => [seat.id, seat])), [venueSeats]);
  const activeSeat = useMemo(() => (activeSeatId === null ? null : (seatById.get(activeSeatId) ?? null)), [activeSeatId, seatById]);
  const activeSeatStatus = useMemo(
    () => (activeSeat && venueSeatStates ? (venueSeatStates.get(activeSeat.id)?.status ?? "available") : null),
    [activeSeat, venueSeatStates],
  );
  const isTooltipVisible = tooltipPosition !== null && activeSeatStatus !== null && isHeldSeatStatus(activeSeatStatus);

  const updateTooltipPosition = useCallback((element: SVGGElement) => {
    const seatRect = element.getBoundingClientRect();
    setTooltipPosition((current) => {
      const left = seatRect.left + seatRect.width / 2 + window.scrollX;
      const top = seatRect.top + window.scrollY;
      const bottom = seatRect.top + seatRect.height + window.scrollY;
      if (current && current.left === left && current.top === top && current.bottom === bottom) return current;
      return { left, top, bottom };
    });
  }, []);

  const handlePointerEnter = useCallback(
    (event: PointerEvent<SVGGElement>, seat: VenueSeatResponse) => {
      if (event.pointerType !== "mouse") {
        setActiveSeatId(null);
        setTooltipPosition(null);
        return;
      }

      const status = venueSeatStatesRef.current?.get(seat.id)?.status ?? "available";
      if (!isHeldSeatStatus(status)) return;

      updateTooltipPosition(event.currentTarget);
      setActiveSeatId(seat.id);
    },
    [updateTooltipPosition],
  );

  const handlePointerMove = useCallback(
    (event: PointerEvent<SVGGElement>) => {
      if (event.pointerType !== "mouse") return;

      updateTooltipPosition(event.currentTarget);
    },
    [updateTooltipPosition],
  );

  const handlePointerLeave = useCallback(() => {
    setActiveSeatId(null);
    setTooltipPosition(null);
  }, []);

  return {
    activeSeat,
    activeSeatStatus,
    isTooltipVisible,
    tooltipPosition,
    handlePointerEnter,
    handlePointerMove,
    handlePointerLeave,
  };
};
