import { type CreateVenueSeatRequest, VENUE_SEAT_HEIGHT, VENUE_SEAT_WIDTH } from "@entities/venue";

export const doVenueSeatsOverlap = (first: CreateVenueSeatRequest, second: CreateVenueSeatRequest): boolean => {
  const deltaX = Math.abs(first.positionX - second.positionX);
  const deltaY = Math.abs(first.positionY - second.positionY);
  if (deltaX < VENUE_SEAT_WIDTH && deltaY < VENUE_SEAT_HEIGHT) return true;
  return false;
};

export const getVenueSeatCollisionMap = (venueSeats: CreateVenueSeatRequest[]): Map<number, Set<number>> => {
  const collisionMap = new Map<number, Set<number>>();

  venueSeats.forEach((seat, firstIndex) => {
    for (let secondIndex = firstIndex + 1; secondIndex < venueSeats.length; secondIndex += 1) {
      if (!doVenueSeatsOverlap(seat, venueSeats[secondIndex])) continue;

      collisionMap.set(firstIndex, (collisionMap.get(firstIndex) ?? new Set()).add(secondIndex));
      collisionMap.set(secondIndex, (collisionMap.get(secondIndex) ?? new Set()).add(firstIndex));
    }
  });

  return collisionMap;
};
