import { type KeyboardEvent, useState } from "react";

import type { VenueSeatResponse } from "@entities/venue";

import { findAdjacentSeat, isSeatNavigationDirection } from "./venue-map-selection.utils";

export const useVenueMapSelection = (seats: VenueSeatResponse[] = []) => {
  const [selectedSeat, setSelectedSeat] = useState<VenueSeatResponse | null>(null);

  const selectSeat = (seat: VenueSeatResponse | null) => {
    setSelectedSeat(seat);
  };

  const getSeatTabIndex = (seat: VenueSeatResponse) => {
    const focusableSeatId = selectedSeat?.id ?? seats[0]?.id;

    return focusableSeatId === seat.id ? 0 : -1;
  };

  const handleSeatKeyDown = (event: KeyboardEvent<SVGRectElement>, seat: VenueSeatResponse) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      selectSeat(seat);

      return;
    }

    if (!isSeatNavigationDirection(event.key)) return;

    const adjacentSeat = findAdjacentSeat(seat, seats, event.key);
    if (!adjacentSeat) return;

    event.preventDefault();
    selectSeat(adjacentSeat);

    event.currentTarget.ownerSVGElement?.querySelector<SVGRectElement>(`[data-seat-id="${adjacentSeat.id}"]`)?.focus();
  };

  return {
    selectedSeat,
    selectSeat,
    getSeatTabIndex,
    handleSeatKeyDown,
  };
};
