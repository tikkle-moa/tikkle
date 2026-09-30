export interface DragSelectionArea {
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
}

export interface DragSelectionState extends DragSelectionArea {
  pointerId: number;
  additive: boolean;
  baseSeatIds: number[];
  startedOnSeat: boolean;
}
