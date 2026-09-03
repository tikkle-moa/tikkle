import { type CreateVenueRequest, VENUE_SEAT_HEIGHT, VENUE_SEAT_WIDTH } from "@entities/venue";

import type { VenueFormSeat } from "./venue-form.types";
import type { BoundingBox, VenueSeatCollisionOption } from "./venue-seat-collision.types";

export const doVenueSeatsOverlap = (first: BoundingBox, second: BoundingBox): boolean => {
  const { positionX: firstX, positionY: firstY, width: firstWidth = VENUE_SEAT_WIDTH, height: firstHeight = VENUE_SEAT_HEIGHT } = first;
  const { positionX: secondX, positionY: secondY, width: secondWidth = VENUE_SEAT_WIDTH, height: secondHeight = VENUE_SEAT_HEIGHT } = second;
  const deltaX = Math.abs(firstX - secondX);
  const deltaY = Math.abs(firstY - secondY);
  if (deltaX < (firstWidth + secondWidth) / 2 && deltaY < (firstHeight + secondHeight) / 2) return true;
  return false;
};

export const getVenueSeatCollisionMap = (
  venue: CreateVenueRequest,
  venueSeats: VenueFormSeat[],
  collisionOption: VenueSeatCollisionOption | null = null,
): Map<number, Set<number>> => {
  const collisionMap = new Map<number, Set<number>>(
    [...(collisionOption?.currentCollisionMap ?? [])].map(([clientId, collidingClientIds]) => [clientId, new Set(collidingClientIds)]),
  );

  const venueStageBoundingBox: BoundingBox = {
    positionX: venue.stagePositionX,
    positionY: venue.stagePositionY,
    width: venue.stageWidth,
    height: venue.stageHeight,
  };

  const addCollision = (clientId: number, collidingClientId: number) => {
    const existingCollisions = collisionMap.get(clientId) ?? new Set<number>();
    existingCollisions.add(collidingClientId);
    collisionMap.set(clientId, existingCollisions);
  };

  if (collisionOption) {
    const targetClientIdSet = new Set(collisionOption.targetClientIds);
    targetClientIdSet.forEach((targetClientId) => {
      const previousCollidingClientIds = collisionMap.get(targetClientId);
      collisionMap.delete(targetClientId);

      previousCollidingClientIds?.forEach((collidingClientId) => {
        const collisions = collisionMap.get(collidingClientId);
        if (!collisions) return;

        collisions.delete(targetClientId);
        if (collisions.size === 0) collisionMap.delete(collidingClientId);
      });
    });

    const targetSeats = venueSeats.filter((seat) => targetClientIdSet.has(seat.clientId));
    targetSeats.forEach((targetSeat) => {
      venueSeats.forEach((seat) => {
        if (seat.clientId === targetSeat.clientId) return;
        if (targetClientIdSet.has(seat.clientId) && seat.clientId < targetSeat.clientId) return;
        if (!doVenueSeatsOverlap(seat, targetSeat)) return;
        addCollision(targetSeat.clientId, seat.clientId);
        addCollision(seat.clientId, targetSeat.clientId);
      });

      if (!doVenueSeatsOverlap(targetSeat, venueStageBoundingBox)) return;
      addCollision(targetSeat.clientId, -1);
    });
  } else {
    venueSeats.forEach((firstSeat, firstIndex) => {
      for (let secondIndex = firstIndex + 1; secondIndex < venueSeats.length; secondIndex += 1) {
        const secondSeat = venueSeats[secondIndex];
        if (!doVenueSeatsOverlap(firstSeat, secondSeat)) continue;
        addCollision(firstSeat.clientId, secondSeat.clientId);
        addCollision(secondSeat.clientId, firstSeat.clientId);
      }

      if (!doVenueSeatsOverlap(firstSeat, venueStageBoundingBox)) return;
      addCollision(firstSeat.clientId, -1);
    });
  }

  return collisionMap;
};
