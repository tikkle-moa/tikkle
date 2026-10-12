import { type Dispatch, type SetStateAction, useEffect, useMemo, useState } from "react";

import type { VenueSeatResponse, VenueSeatState } from "@entities/venue";

import type { MyHeldSeatInfo, SeatOperationStatus } from "./seat-map.types";
import { areVenueSeatStatesEqual, createVenueSeatStates, filterSelectableSeatIds, getMyHoldSummary } from "./seat-map.utils";

interface UsePerformanceSeatAvailabilityProps {
  venueSeats: VenueSeatResponse[];
  selectedSeatIds: Set<number>;
  venueSeatStates: Map<number, VenueSeatState>;
  seatOperationStatus: SeatOperationStatus;
  setVenueSeatStates: Dispatch<SetStateAction<Map<number, VenueSeatState>>>;
  setSelectedSeatIds: Dispatch<SetStateAction<Set<number>>>;
}

export const usePerformanceSeatAvailability = ({
  venueSeats,
  selectedSeatIds,
  venueSeatStates,
  seatOperationStatus,
  setVenueSeatStates,
  setSelectedSeatIds,
}: UsePerformanceSeatAvailabilityProps) => {
  const [bookedSeatIds, setBookedSeatIds] = useState<Set<number>>(new Set());
  const [heldSeatExpiresAtBySeatId, setHeldSeatExpiresAtBySeatId] = useState<Map<number, Date>>(new Map());
  const [myHeldSeatInfoBySeatId, setMyHeldSeatInfoBySeatId] = useState<Map<number, MyHeldSeatInfo>>(new Map());

  const nextVenueSeatStates = useMemo(
    () => createVenueSeatStates(venueSeats, bookedSeatIds, heldSeatExpiresAtBySeatId, myHeldSeatInfoBySeatId),
    [bookedSeatIds, heldSeatExpiresAtBySeatId, myHeldSeatInfoBySeatId, venueSeats],
  );

  useEffect(() => {
    setVenueSeatStates((current) => (areVenueSeatStatesEqual(current, nextVenueSeatStates) ? current : nextVenueSeatStates));
  }, [nextVenueSeatStates, setVenueSeatStates]);

  useEffect(() => {
    if (seatOperationStatus === "loading") return;

    setSelectedSeatIds((current) => {
      const updated = new Set(filterSelectableSeatIds(current, nextVenueSeatStates));
      return updated.size === current.size ? current : updated;
    });
  }, [nextVenueSeatStates, seatOperationStatus, setSelectedSeatIds]);

  const venueSeatById = useMemo(() => new Map(venueSeats.map((venueSeat) => [venueSeat.id, venueSeat])), [venueSeats]);

  const selectedSeatIdsToHold = useMemo(
    () => Array.from(selectedSeatIds).filter((seatId) => venueSeatStates.get(seatId)?.status === "available"),
    [venueSeatStates, selectedSeatIds],
  );

  const selectedSeatIdsToRelease = useMemo(
    () => Array.from(selectedSeatIds).filter((seatId) => myHeldSeatInfoBySeatId.has(seatId)),
    [myHeldSeatInfoBySeatId, selectedSeatIds],
  );

  const { myHolds, myHeldSeatTotalPrice } = useMemo(
    () => getMyHoldSummary(myHeldSeatInfoBySeatId, venueSeatById),
    [myHeldSeatInfoBySeatId, venueSeatById],
  );

  return {
    myHolds,
    myHeldSeatInfoBySeatId,
    selectedSeatIdsToHold,
    selectedSeatIdsToRelease,
    myHeldSeatTotalPrice,
    venueSeatById,
    setBookedSeatIds,
    setHeldSeatExpiresAtBySeatId,
    setMyHeldSeatInfoBySeatId,
  };
};
