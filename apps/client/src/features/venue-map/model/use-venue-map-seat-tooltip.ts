import { type PointerEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";

import { type VenueSeatResponse, type VenueSeatState, isHeldSeatStatus } from "@entities/venue";

import type { TooltipPlacement } from "./venue-map.types";
import { getOppositeTooltipPlacement } from "./venue-map.utils";

interface UseVenueMapSeatTooltipProps {
  venueSeats: VenueSeatResponse[];
  venueSeatStates?: ReadonlyMap<number, VenueSeatState>;
}

export const useVenueMapSeatTooltip = ({ venueSeats, venueSeatStates }: UseVenueMapSeatTooltipProps) => {
  const [activeSeatId, setActiveSeatId] = useState<number | null>(null);
  const [tooltipPlacement, setTooltipPlacement] = useState<TooltipPlacement>("bottom-right");
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
  const isTooltipVisible = activeSeatStatus !== null && isHeldSeatStatus(activeSeatStatus);

  const handlePointerEnter = useCallback((event: PointerEvent<SVGGElement>, seat: VenueSeatResponse) => {
    if (event.pointerType !== "mouse") {
      setActiveSeatId(null);
      return;
    }

    const status = venueSeatStatesRef.current?.get(seat.id)?.status ?? "available";
    if (!isHeldSeatStatus(status)) return;

    const svgRect = event.currentTarget.ownerSVGElement?.getBoundingClientRect();
    if (svgRect) {
      const isTop = event.clientY < svgRect.top + svgRect.height / 2;
      const isLeft = event.clientX < svgRect.left + svgRect.width / 2;
      setTooltipPlacement(getOppositeTooltipPlacement(isTop, isLeft));
    }
    setActiveSeatId(seat.id);
  }, []);

  const handlePointerMove = useCallback((event: PointerEvent<SVGGElement>) => {
    if (event.pointerType !== "mouse") return;

    const svgRect = event.currentTarget.ownerSVGElement?.getBoundingClientRect();
    if (!svgRect) return;

    setTooltipPlacement((current) => {
      const isTop = event.clientY < svgRect.top + svgRect.height / 2;
      const isLeft = event.clientX < svgRect.left + svgRect.width / 2;
      const next = getOppositeTooltipPlacement(isTop, isLeft);
      return current === next ? current : next;
    });
  }, []);

  const handlePointerLeave = useCallback(() => setActiveSeatId(null), []);

  return {
    activeSeat,
    activeSeatStatus,
    isTooltipVisible,
    tooltipPlacement,
    handlePointerEnter,
    handlePointerMove,
    handlePointerLeave,
  };
};
