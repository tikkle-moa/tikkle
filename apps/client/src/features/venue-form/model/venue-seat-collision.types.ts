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
