import type { VenueSeatStatus } from "./venue-seat.types";

export const isHeldSeatStatus = (status: VenueSeatStatus) => {
  return status === "held_by_my_group" || status === "held_by_other_group";
};

export const areSeatIdsEqual = (first: ReadonlySet<number> | undefined, second: ReadonlySet<number> | undefined) => {
  if (first === second) return true;
  if (!first || !second || first.size !== second.size) return false;

  for (const value of first) {
    if (!second.has(value)) return false;
  }

  return true;
};
