import { useCallback, useEffect, useRef, useState } from "react";

import { type VenueSeatState, areSeatIdsEqual } from "@entities/venue";

import type { SeatOperationState } from "./seat-map.types";
import { filterSelectableSeatIds } from "./seat-map.utils";

export const usePerformanceSeatMap = () => {
  const [selectedSeatIds, setSelectedSeatIds] = useState<Set<number>>(new Set());
  const [serverTimeOffset, setServerTimeOffset] = useState(0);

  const [seatOperationState, setSeatOperationState] = useState<SeatOperationState>({ status: "idle" });
  const seatOperationStatusRef = useRef(seatOperationState.status);
  useEffect(() => {
    seatOperationStatusRef.current = seatOperationState.status;
  }, [seatOperationState.status]);

  const [venueSeatStates, setVenueSeatStates] = useState<Map<number, VenueSeatState>>(new Map());
  const venueSeatStatesRef = useRef(venueSeatStates);
  useEffect(() => {
    venueSeatStatesRef.current = venueSeatStates;
  }, [venueSeatStates]);

  const toggleSeat = useCallback((seatId: number) => {
    const status = venueSeatStatesRef.current.get(seatId)?.status;
    if ((status !== "available" && status !== "held_by_my_group") || seatOperationStatusRef.current === "loading") return;

    setSelectedSeatIds((current) => {
      const updated = new Set(current);
      if (updated.has(seatId)) {
        updated.delete(seatId);
      } else {
        updated.add(seatId);
      }
      return updated;
    });
    setSeatOperationState((current) => (current.status === "idle" ? current : { status: "idle" }));
  }, []);

  const toggleHeldSeats = useCallback((seatIds: readonly number[]) => {
    if (seatOperationStatusRef.current === "loading") return;

    const heldSeatIds = [...new Set(seatIds)].filter((seatId) => venueSeatStatesRef.current.get(seatId)?.status === "held_by_my_group");
    if (heldSeatIds.length === 0) return;

    setSelectedSeatIds((current) => {
      const shouldSelect = heldSeatIds.some((seatId) => !current.has(seatId));
      const updated = new Set(current);
      heldSeatIds.forEach((seatId) => {
        if (shouldSelect) updated.add(seatId);
        else updated.delete(seatId);
      });
      return updated;
    });
    setSeatOperationState((current) => (current.status === "idle" ? current : { status: "idle" }));
  }, []);

  const selectSeats = useCallback((seatIds: ReadonlySet<number>) => {
    if (seatOperationStatusRef.current === "loading") return;
    const selectableSeatIds = new Set(filterSelectableSeatIds(seatIds, venueSeatStatesRef.current));

    setSelectedSeatIds((current) => (areSeatIdsEqual(current, selectableSeatIds) ? current : selectableSeatIds));
    setSeatOperationState((current) => (current.status === "idle" ? current : { status: "idle" }));
  }, []);

  return {
    selectedSeatIds,
    setSelectedSeatIds,
    seatOperationState,
    setSeatOperationState,
    serverTimeOffset,
    setServerTimeOffset,
    venueSeatStates,
    setVenueSeatStates,
    toggleSeat,
    toggleHeldSeats,
    selectSeats,
  };
};
