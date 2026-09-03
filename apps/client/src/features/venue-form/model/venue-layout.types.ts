export type SeatOrigin = { clientId: number; positionX: number; positionY: number };

export type VenueLayoutDragState =
  | { type: "stage"; pointerX: number; pointerY: number; originX: number; originY: number }
  | { type: "seats"; pointerX: number; pointerY: number; origins: SeatOrigin[] }
  | { type: "pan"; moved: boolean }
  | { type: "select"; startX: number; startY: number; currentX: number; currentY: number; additive: boolean; baseClientIds: number[] };
