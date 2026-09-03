import type { VenueFormSeat } from "./venue-form.types";

export interface BoundingBox {
  positionX: number;
  positionY: number;
  width?: number;
  height?: number;
}

export interface VenueSeatCollisionOption {
  currentCollisionMap: Map<number, Set<number>>;
  targetClientIds: number[];
}

export type VenueSeatGrid = Map<string, VenueFormSeat[]>;
