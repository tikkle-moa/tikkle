import { type KeyboardEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { VenueSeatResponse } from "@entities/venue";

import { findAdjacentSeat, isSeatNavigationDirection } from "./venue-map-selection.utils";

export const useVenueMapSelection = (venueSeats: VenueSeatResponse[] = []) => {
  const [selectedSeat, setSelectedSeat] = useState<VenueSeatResponse | null>(null);
  const venueSeatsRef = useRef(venueSeats);

  useEffect(() => {
    venueSeatsRef.current = venueSeats;
  }, [venueSeats]);

  const selectSeat = useCallback((seat: VenueSeatResponse | null) => {
    setSelectedSeat(seat);
  }, []);

  const getSeatTabIndex = useCallback(
    (seat: VenueSeatResponse) => {
      const focusableSeatId = selectedSeat?.id ?? venueSeats[0]?.id;

      return focusableSeatId === seat.id ? 0 : -1;
    },
    [selectedSeat, venueSeats],
  );

  const handleSeatKeyDown = useCallback(
    (event: KeyboardEvent<SVGElement>, seat: VenueSeatResponse) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        selectSeat(seat);

        return;
      }

      if (!isSeatNavigationDirection(event.key)) return;

      const adjacentSeat = findAdjacentSeat(seat, venueSeatsRef.current, event.key);
      if (!adjacentSeat) return;

      event.preventDefault();
      selectSeat(adjacentSeat);

      event.currentTarget.ownerSVGElement?.querySelector<SVGGElement>(`[data-seat-id="${adjacentSeat.id}"]`)?.focus();
    },
    [selectSeat],
  );

  return useMemo(
    () => ({
      selectedSeat,
      selectSeat,
      getSeatTabIndex,
      handleSeatKeyDown,
    }),
    [getSeatTabIndex, handleSeatKeyDown, selectSeat, selectedSeat],
  );
};
