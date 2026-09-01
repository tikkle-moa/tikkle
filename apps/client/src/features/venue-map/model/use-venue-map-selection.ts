import { type KeyboardEvent, useState } from "react";

import type { VenueSeatResponse } from "@entities/venue";

type Direction = "ArrowDown" | "ArrowLeft" | "ArrowRight" | "ArrowUp";

const isDirection = (key: string): key is Direction => key === "ArrowLeft" || key === "ArrowRight" || key === "ArrowUp" || key === "ArrowDown";

const findAdjacentSeat = (currentSeat: VenueSeatResponse, seats: VenueSeatResponse[], direction: Direction) => {
  const isHorizontal = direction === "ArrowLeft" || direction === "ArrowRight";
  const isPositive = direction === "ArrowRight" || direction === "ArrowDown";

  return seats.reduce<VenueSeatResponse | null>((closestSeat, seat) => {
    if (seat.id === currentSeat.id) return closestSeat;

    const primaryOffset = isHorizontal ? seat.positionX - currentSeat.positionX : seat.positionY - currentSeat.positionY;
    const secondaryOffset = isHorizontal ? seat.positionY - currentSeat.positionY : seat.positionX - currentSeat.positionX;
    const isSameDirection = isPositive ? primaryOffset > 0 : primaryOffset < 0;

    if (!isSameDirection) return closestSeat;

    if (!closestSeat) return seat;

    const closestPrimaryOffset = isHorizontal ? closestSeat.positionX - currentSeat.positionX : closestSeat.positionY - currentSeat.positionY;
    const closestSecondaryOffset = isHorizontal ? closestSeat.positionY - currentSeat.positionY : closestSeat.positionX - currentSeat.positionX;

    const score = Math.abs(secondaryOffset) * 1_000 + Math.abs(primaryOffset);
    const closestScore = Math.abs(closestSecondaryOffset) * 1_000 + Math.abs(closestPrimaryOffset);

    return score < closestScore ? seat : closestSeat;
  }, null);
};

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

    if (!isDirection(event.key)) return;

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
