import type { VenueSeatResponse, VenueSeatState } from "@entities/venue";

import type { ConnectionStyle, MyHeldSeatInfo, MyHoldInfo } from "./seat-map.types";

export const filterSelectableSeatIds = (seatIds: ReadonlySet<number>, venueSeatStates: Map<number, VenueSeatState>) => {
  return [...seatIds].filter((seatId) => {
    const status = venueSeatStates.get(seatId)?.status;
    return status === "available" || status === "held_by_me";
  });
};

export const createVenueSeatStates = (
  venueSeats: VenueSeatResponse[],
  bookedSeatIds: Set<number>,
  heldSeatExpiresAtBySeatId: Map<number, Date>,
  myHeldSeatInfoBySeatId: Map<number, MyHeldSeatInfo>,
): Map<number, VenueSeatState> => {
  const states = new Map(venueSeats.map((venueSeat) => [venueSeat.id, { status: "available" } as VenueSeatState]));

  heldSeatExpiresAtBySeatId.forEach((expiresAt, seatId) => states.set(seatId, { status: "held_by_other", expiresAt }));
  myHeldSeatInfoBySeatId.forEach(({ expiresAt }, seatId) => states.set(seatId, { status: "held_by_me", expiresAt }));
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

export const getMyHoldSummary = (myHeldSeatInfoBySeatId: Map<number, MyHeldSeatInfo>, venueSeatById: Map<number, VenueSeatResponse>) => {
  const myHoldInfoByHoldId = new Map<string, MyHoldInfo>();
  let myHeldSeatTotalPrice = 0;

  myHeldSeatInfoBySeatId.forEach(({ holdId, expiresAt }, seatId) => {
    myHeldSeatTotalPrice += venueSeatById.get(seatId)?.price ?? 0;

    const holdInfo = myHoldInfoByHoldId.get(holdId);

    if (holdInfo) {
      holdInfo.venueSeatIds.push(seatId);
    } else {
      myHoldInfoByHoldId.set(holdId, { holdId, venueSeatIds: [seatId], expiresAt });
    }
  });

  const myHolds = Array.from(myHoldInfoByHoldId.values());

  return { myHolds, myHeldSeatTotalPrice };
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
