import type { VenueSeatResponse, VenueSeatState } from "@entities/venue";

import type { ConnectionStyle, MyGroupHeldSeatInfo } from "./seat-map.types";

export const filterSelectableSeatIds = (seatIds: ReadonlySet<number>, venueSeatStates: Map<number, VenueSeatState>) => {
  return [...seatIds].filter((seatId) => {
    const status = venueSeatStates.get(seatId)?.status;
    return status === "available" || status === "held_by_my_group";
  });
};

export const createVenueSeatStates = (
  venueSeats: VenueSeatResponse[],
  bookedSeatIds: Set<number>,
  heldSeatExpiresAtBySeatId: Map<number, Date>,
  myGroupHeldSeatInfoBySeatId: Map<number, MyGroupHeldSeatInfo>,
): Map<number, VenueSeatState> => {
  const states = new Map(venueSeats.map((venueSeat) => [venueSeat.id, { status: "available" } as VenueSeatState]));

  heldSeatExpiresAtBySeatId.forEach((expiresAt, seatId) => states.set(seatId, { status: "held_by_other_group", expiresAt }));
  myGroupHeldSeatInfoBySeatId.forEach(({ expiresAt }, seatId) => states.set(seatId, { status: "held_by_my_group", expiresAt }));
  bookedSeatIds.forEach((seatId) => states.set(seatId, { status: "booked" }));

  return states;
};

export const areVenueSeatStatesEqual = (first: ReadonlyMap<number, VenueSeatState>, second: ReadonlyMap<number, VenueSeatState>) => {
  if (first === second) return true;
  if (first.size !== second.size) return false;

  for (const [seatId, firstState] of first) {
    const secondState = second.get(seatId);
    if (!secondState || firstState.status !== secondState.status) return false;

    const firstExpiresAt = firstState.expiresAt?.getTime() ?? undefined;
    const secondExpiresAt = secondState.expiresAt?.getTime() ?? undefined;
    if (firstExpiresAt !== secondExpiresAt) return false;
  }

  return true;
};

export const getMyGroupHoldSummary = (
  myGroupHeldSeatInfoBySeatId: Map<number, MyGroupHeldSeatInfo>,
  venueSeatById: Map<number, VenueSeatResponse>,
) => {
  const myGroupHoldInfoByHoldId = new Map<string, { expiresAt: Date; venueSeatIds: number[] }>();
  let myGroupHeldSeatTotalPrice = 0;

  myGroupHeldSeatInfoBySeatId.forEach(({ holdId, expiresAt }, seatId) => {
    myGroupHeldSeatTotalPrice += venueSeatById.get(seatId)?.price ?? 0;

    if (myGroupHoldInfoByHoldId.has(holdId)) {
      myGroupHoldInfoByHoldId.get(holdId)!.venueSeatIds.push(seatId);
    } else {
      myGroupHoldInfoByHoldId.set(holdId, { expiresAt, venueSeatIds: [seatId] });
    }
  });

  return { myGroupHoldInfoByHoldId, myGroupHeldSeatTotalPrice };
};

export const getConnectionStyle = (isConnected: boolean): ConnectionStyle => {
  if (!isConnected) {
    return {
      label: "연결 중",
      description: "실시간 좌석 상태를 동기화하고 있어요.",
      className: "border-amber-200 bg-amber-50 text-amber-700",
      dotClassName: "animate-pulse bg-amber-500",
    };
  }

  return {
    label: "실시간 연결됨",
    description: "다른 관람객의 좌석 상태도 실시간으로 반영됩니다.",
    className: "border-emerald-200 bg-emerald-50 text-emerald-700",
    dotClassName: "animate-pulse bg-emerald-500",
  };
};
