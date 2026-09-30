import type { VenueSeatResponse } from "@entities/venue";

import { SEAT_NAVIGATION_SECONDARY_DISTANCE_WEIGHT } from "./venue-map-selection.constants";
import type { SeatNavigationDirection } from "./venue-map-selection.types";

export const isSeatNavigationDirection = (key: string): key is SeatNavigationDirection =>
  key === "ArrowLeft" || key === "ArrowRight" || key === "ArrowUp" || key === "ArrowDown";

export const findAdjacentSeat = (currentSeat: VenueSeatResponse, venueSeats: VenueSeatResponse[], direction: SeatNavigationDirection) => {
  const isHorizontal = direction === "ArrowLeft" || direction === "ArrowRight";
  const isPositive = direction === "ArrowRight" || direction === "ArrowDown";

  return venueSeats.reduce<VenueSeatResponse | null>((closestSeat, seat) => {
    if (seat.id === currentSeat.id) return closestSeat;

    const primaryOffset = isHorizontal ? seat.positionX - currentSeat.positionX : seat.positionY - currentSeat.positionY;
    const secondaryOffset = isHorizontal ? seat.positionY - currentSeat.positionY : seat.positionX - currentSeat.positionX;
    const isSameDirection = isPositive ? primaryOffset > 0 : primaryOffset < 0;

    if (!isSameDirection) return closestSeat;
    if (!closestSeat) return seat;

    const closestPrimaryOffset = isHorizontal ? closestSeat.positionX - currentSeat.positionX : closestSeat.positionY - currentSeat.positionY;
    const closestSecondaryOffset = isHorizontal ? closestSeat.positionY - currentSeat.positionY : closestSeat.positionX - currentSeat.positionX;

    const score = Math.abs(secondaryOffset) * SEAT_NAVIGATION_SECONDARY_DISTANCE_WEIGHT + Math.abs(primaryOffset);
    const closestScore = Math.abs(closestSecondaryOffset) * SEAT_NAVIGATION_SECONDARY_DISTANCE_WEIGHT + Math.abs(closestPrimaryOffset);

    return score < closestScore ? seat : closestSeat;
  }, null);
};
