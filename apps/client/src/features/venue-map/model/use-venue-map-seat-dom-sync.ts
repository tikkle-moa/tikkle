import { type RefObject, useLayoutEffect, useMemo, useRef } from "react";

import { VENUE_SEAT_STYLE_MAP, type VenueSeatResponse, type VenueSeatState, isHeldSeatStatus } from "@entities/venue";

import type { SeatElements } from "./venue-map.types";
import { createVenueSeatLabelMap, getSeatStatusMessage } from "./venue-map.utils";

interface UseVenueMapSeatDomSyncProps {
  svgRef: RefObject<SVGSVGElement | null>;
  venueSeats: VenueSeatResponse[];
  venueSeatStates?: ReadonlyMap<number, VenueSeatState>;
  serverTimeOffset: number;
  isHoldMode: boolean;
}

export const useVenueMapSeatDomSync = ({ svgRef, venueSeats, venueSeatStates, serverTimeOffset, isHoldMode }: UseVenueMapSeatDomSyncProps) => {
  const seatLabelById = useMemo(() => createVenueSeatLabelMap(venueSeats), [venueSeats]);
  const previousSeatStatesRef = useRef(venueSeatStates);
  const previousServerTimeOffsetRef = useRef(serverTimeOffset);
  const seatElementsByIdRef = useRef(new Map<number, SeatElements>());

  useLayoutEffect(() => {
    seatElementsByIdRef.current.clear();
  }, [venueSeats]);

  useLayoutEffect(() => {
    if (!venueSeatStates) {
      previousSeatStatesRef.current = venueSeatStates;
      previousServerTimeOffsetRef.current = serverTimeOffset;
      return;
    }

    const seatElementsById = seatElementsByIdRef.current;
    if (seatElementsById.size === 0) {
      svgRef.current?.querySelectorAll<SVGGElement>("[data-seat-id]").forEach((element) => {
        const seatId = Number(element.dataset.seatId);
        if (!Number.isFinite(seatId)) return;

        seatElementsById.set(seatId, {
          container: element,
          visual: element.querySelector<SVGRectElement>("[data-seat-visual]"),
        });
      });
    }

    const previousSeatStates = previousSeatStatesRef.current;
    const serverTimeChanged = previousServerTimeOffsetRef.current !== serverTimeOffset;
    const statusDescriptionByKey = new Map<string, string>();

    venueSeats.forEach((seat) => {
      const previousState = previousSeatStates?.get(seat.id) ?? { status: "available" as const };
      const nextState = venueSeatStates.get(seat.id) ?? { status: "available" as const };
      const previousExpiresAt = previousState.expiresAt?.getTime();
      const nextExpiresAt = nextState.expiresAt?.getTime();
      const isHeld = isHeldSeatStatus(nextState.status);

      if (previousState.status === nextState.status && previousExpiresAt === nextExpiresAt && (!serverTimeChanged || !isHeld)) {
        return;
      }

      const seatElements = seatElementsById.get(seat.id);
      if (!seatElements) return;
      const { container, visual } = seatElements;

      const isSeatSelectable = !isHoldMode || nextState.status === "available" || nextState.status === "held_by_my_group";
      const statusKey = `${nextState.status}:${nextExpiresAt ?? ""}:${isHeld ? serverTimeOffset : 0}`;
      let statusDescription = statusDescriptionByKey.get(statusKey);
      if (statusDescription === undefined) {
        statusDescription = getSeatStatusMessage(nextState.status, nextState.expiresAt, undefined, isHeld ? serverTimeOffset : 0);
        statusDescriptionByKey.set(statusKey, statusDescription);
      }

      container.dataset.seatStatus = nextState.status;
      container.setAttribute("aria-label", `${seatLabelById.get(seat.id)}, ${statusDescription}`);
      if (isHoldMode) container.setAttribute("aria-disabled", String(!isSeatSelectable));
      container.classList.toggle("cursor-pointer", isSeatSelectable);
      container.classList.toggle("cursor-not-allowed", !isSeatSelectable);

      visual?.setAttribute("fill", VENUE_SEAT_STYLE_MAP[nextState.status].fill);
      visual?.setAttribute("fill-opacity", nextState.status === "booked" ? "0.72" : "1");
      visual?.setAttribute("stroke", VENUE_SEAT_STYLE_MAP[nextState.status].stroke);
      visual?.setAttribute("stroke-width", "0.3");
      visual?.classList.toggle("group-hover:brightness-95", isSeatSelectable || isHeld);
    });

    previousSeatStatesRef.current = venueSeatStates;
    previousServerTimeOffsetRef.current = serverTimeOffset;
  }, [isHoldMode, seatLabelById, serverTimeOffset, svgRef, venueSeatStates, venueSeats]);

  return seatLabelById;
};
