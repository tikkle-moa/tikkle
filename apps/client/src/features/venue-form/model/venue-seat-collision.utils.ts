import { type CreateVenueRequest, VENUE_SEAT_HEIGHT, VENUE_SEAT_WIDTH } from "@entities/venue";

import type { VenueFormSeat } from "./venue-form.types";
import type { BoundingBox, VenueSeatCollisionOption, VenueSeatGrid } from "./venue-seat-collision.types";

const getSeatGridKey = (gridX: number, gridY: number) => `${gridX}\u0000${gridY}`;

const getSeatGridPosition = (seat: BoundingBox) => ({
  gridX: Math.floor(seat.positionX / VENUE_SEAT_WIDTH),
  gridY: Math.floor(seat.positionY / VENUE_SEAT_HEIGHT),
});

export const getNearbyVenueSeats = (seat: BoundingBox, seatGrid: VenueSeatGrid, callback: (nearbySeat: VenueFormSeat) => boolean | void) => {
  const { gridX, gridY } = getSeatGridPosition(seat);
  for (let offsetX = -1; offsetX <= 1; offsetX += 1) {
    for (let offsetY = -1; offsetY <= 1; offsetY += 1) {
      const nearbySeatsInCell = seatGrid.get(getSeatGridKey(gridX + offsetX, gridY + offsetY));
      if (!nearbySeatsInCell) continue;
      for (const nearbySeat of nearbySeatsInCell) {
        if (callback(nearbySeat) === true) return true;
      }
    }
  }
  return false;
};

export const addVenueSeatToGrid = (seat: VenueFormSeat, seatGrid: VenueSeatGrid) => {
  const { gridX, gridY } = getSeatGridPosition(seat);
  const gridKey = getSeatGridKey(gridX, gridY);
  const seats = seatGrid.get(gridKey) ?? [];

  seats.push(seat);
  seatGrid.set(gridKey, seats);
};

export const createVenueSeatGrid = (venueSeats: VenueFormSeat[]): VenueSeatGrid => {
  const seatGrid: VenueSeatGrid = new Map();
  venueSeats.forEach((seat) => addVenueSeatToGrid(seat, seatGrid));
  return seatGrid;
};

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
        if (collidingClientId === -1) return;

        const collisions = collisionMap.get(collidingClientId);
        if (!collisions) return;

        collisions.delete(targetClientId);
        if (collisions.size === 0) collisionMap.delete(collidingClientId);
      });
    });

    const seatGrid = createVenueSeatGrid(venueSeats);

    venueSeats.forEach((targetSeat) => {
      if (!targetClientIdSet.has(targetSeat.clientId)) return;

      getNearbyVenueSeats(targetSeat, seatGrid, (nearbySeat) => {
        if (nearbySeat.clientId === targetSeat.clientId) return;
        if (targetClientIdSet.has(nearbySeat.clientId) && nearbySeat.clientId < targetSeat.clientId) return;
        if (!doVenueSeatsOverlap(targetSeat, nearbySeat)) return;
        addCollision(targetSeat.clientId, nearbySeat.clientId);
        addCollision(nearbySeat.clientId, targetSeat.clientId);
      });

      if (!doVenueSeatsOverlap(targetSeat, venueStageBoundingBox)) return;
      addCollision(targetSeat.clientId, -1);
    });
  } else {
    const seatGrid: VenueSeatGrid = new Map();
    venueSeats.forEach((targetSeat) => {
      getNearbyVenueSeats(targetSeat, seatGrid, (nearbySeat) => {
        if (!doVenueSeatsOverlap(targetSeat, nearbySeat)) return;
        addCollision(targetSeat.clientId, nearbySeat.clientId);
        addCollision(nearbySeat.clientId, targetSeat.clientId);
      });

      addVenueSeatToGrid(targetSeat, seatGrid);

      if (!doVenueSeatsOverlap(targetSeat, venueStageBoundingBox)) return;
      addCollision(targetSeat.clientId, -1);
    });
  }

  return collisionMap;
};
