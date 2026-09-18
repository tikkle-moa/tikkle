import { type Dispatch, type SetStateAction, useEffect, useMemo, useState } from "react";

import type { VenueSeatResponse, VenueSeatState } from "@entities/venue";

import type { MyGroupHeldSeatInfo, SeatOperationStatus } from "./seat-map.types";
import {
  areVenueSeatStatesEqual,
  createVenueSeatStates,
  filterSelectableSeatIds,
  getMyGroupHoldSummary,
  getSelectedSeatOperationIds,
} from "./seat-map.utils";

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
  const [myGroupHeldSeatInfoBySeatId, setMyGroupHeldSeatInfoBySeatId] = useState<Map<number, MyGroupHeldSeatInfo>>(new Map());

  const nextVenueSeatStates = useMemo(
    () => createVenueSeatStates(venueSeats, bookedSeatIds, heldSeatExpiresAtBySeatId, myGroupHeldSeatInfoBySeatId),
    [bookedSeatIds, heldSeatExpiresAtBySeatId, myGroupHeldSeatInfoBySeatId, venueSeats],
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

  const { selectedSeatIdsToHold, selectedSeatIdsToRelease } = useMemo(
    () => getSelectedSeatOperationIds(selectedSeatIds, venueSeatStates),
    [venueSeatStates, selectedSeatIds],
  );

  const { myGroupHoldInfoByHoldId, myGroupHeldSeatTotalPrice } = useMemo(
    () => getMyGroupHoldSummary(myGroupHeldSeatInfoBySeatId, venueSeatById),
    [myGroupHeldSeatInfoBySeatId, venueSeatById],
  );

  return {
    myGroupHoldInfoByHoldId,
    myGroupHeldSeatInfoBySeatId,
    selectedSeatIdsToHold,
    selectedSeatIdsToRelease,
    myGroupHeldSeatTotalPrice,
    venueSeatById,
    setBookedSeatIds,
    setHeldSeatExpiresAtBySeatId,
    setMyGroupHeldSeatInfoBySeatId,
  };
};
