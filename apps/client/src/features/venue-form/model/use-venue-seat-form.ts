import { type Dispatch, type RefObject, type SetStateAction, useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { CreateVenueRequest, CreateVenueSeatRequest } from "@entities/venue";

import type { VenueFormErrors, VenueFormSeat, VenueSeatHistoryEntry } from "./venue-form.types";
import { createVenueSeat, replaceVenueSeatCollisionErrors } from "./venue-form.utils";
import { getVenueSeatCollisionMap } from "./venue-seat-collision.utils";

interface UseVenueSeatFormProps {
  venue: CreateVenueRequest;
  venueSeats: VenueFormSeat[];
  errors: VenueFormErrors;
  venueSeatClientIdRef: RefObject<number>;
  setVenueSeats: Dispatch<SetStateAction<VenueFormSeat[]>>;
  setErrors: Dispatch<SetStateAction<VenueFormErrors>>;
}

export const useVenueSeatForm = ({ venue, venueSeats, errors, venueSeatClientIdRef, setVenueSeats, setErrors }: UseVenueSeatFormProps) => {
  const [selectedSeatClientIds, setSelectedSeatClientIds] = useState<number[]>([]);
  const historyRef = useRef<VenueSeatHistoryEntry[]>([]);
  const collisionMapRef = useRef<Map<number, Set<number>>>(new Map());
  const [canUndo, setCanUndo] = useState(false);

  const selectedSeatClientIdSet = useMemo(() => new Set(selectedSeatClientIds), [selectedSeatClientIds]);
  const errorSeatClientIds = useMemo(
    () =>
      new Set(
        Object.entries(errors).flatMap(([key, value]) => {
          if (!value) return [];
          const match = key.match(/^seat\.(\d+)\./);
          return match ? [Number(match[1])] : [];
        }),
      ),
    [errors],
  );
  const currentSeat = useMemo(
    () => (selectedSeatClientIds.length === 1 ? (venueSeats.find((seat) => seat.clientId === selectedSeatClientIds[0]) ?? null) : null),
    [selectedSeatClientIds, venueSeats],
  );

  const saveLayoutSnapshot = useCallback(() => {
    historyRef.current = [
      ...historyRef.current.slice(-49),
      {
        venueSeats: [...venueSeats],
        collisionMap: new Map([...collisionMapRef.current].map(([clientId, collidingClientIds]) => [clientId, new Set(collidingClientIds)])),
      },
    ];
    setCanUndo(true);
  }, [venueSeats]);

  const recomputeSeatCollisions = useCallback(
    (nextVenueSeats: VenueFormSeat[]) => {
      const collisionMap = getVenueSeatCollisionMap(venue, nextVenueSeats);
      collisionMapRef.current = collisionMap;
      setErrors((current) => {
        const next = replaceVenueSeatCollisionErrors(current, nextVenueSeats, collisionMap);
        const nextEntries = Object.entries(next);
        const isSame = nextEntries.length === Object.keys(current).length && nextEntries.every(([key, message]) => current[key] === message);
        return isSame ? current : next;
      });
    },
    [venue, setErrors],
  );

  const handleUndo = useCallback(() => {
    const snapshot = historyRef.current.at(-1);
    if (!snapshot) return;
    historyRef.current = historyRef.current.slice(0, -1);
    setVenueSeats(snapshot.venueSeats);
    setErrors((current) => {
      collisionMapRef.current = snapshot.collisionMap;
      const next = replaceVenueSeatCollisionErrors(current, snapshot.venueSeats, snapshot.collisionMap);
      const nextEntries = Object.entries(next);
      const isSame = nextEntries.length === Object.keys(current).length && nextEntries.every(([key, message]) => current[key] === message);
      return isSame ? current : next;
    });
    setCanUndo(historyRef.current.length > 0);
    setSelectedSeatClientIds([]);
  }, [setErrors, setVenueSeats]);

  useEffect(() => {
    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== "z" || event.shiftKey) return;
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement || event.target instanceof HTMLSelectElement)
        return;
      event.preventDefault();
      handleUndo();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleUndo]);

  const handleAddSeat = () => {
    saveLayoutSnapshot();
    const nextClientId = venueSeatClientIdRef.current++;
    const nextVenueSeats = [...venueSeats, createVenueSeat(venue.width, venue.height, nextClientId)];
    setVenueSeats(nextVenueSeats);
    recomputeSeatCollisions(nextVenueSeats);
    setSelectedSeatClientIds([nextClientId]);
  };

  const handleAddSeats = (seats: VenueFormSeat[]) => {
    saveLayoutSnapshot();
    const nextVenueSeats = [...venueSeats, ...seats];
    setVenueSeats(nextVenueSeats);
    recomputeSeatCollisions(nextVenueSeats);
  };

  const handleRemoveSelectedSeats = () => {
    if (selectedSeatClientIds.length === 0) return;
    saveLayoutSnapshot();
    const selectedSet = new Set(selectedSeatClientIds);
    const nextVenueSeats = venueSeats.filter((seat) => !selectedSet.has(seat.clientId));
    setVenueSeats(nextVenueSeats);
    recomputeSeatCollisions(nextVenueSeats);
    setSelectedSeatClientIds([]);
  };

  const updateVenueSeat = <K extends keyof CreateVenueSeatRequest>(clientId: number, field: K, value: CreateVenueSeatRequest[K]) => {
    saveLayoutSnapshot();
    const nextVenueSeats = venueSeats.map((seat) => (seat.clientId === clientId ? { ...seat, [field]: value } : seat));
    setVenueSeats(nextVenueSeats);
    if (field === "positionX" || field === "positionY") {
      recomputeSeatCollisions(nextVenueSeats);
    } else {
      setErrors(({ [`seat.${clientId}.${field}`]: _, ...next }) => next);
    }
  };

  return {
    currentSeat,
    selectedSeatClientIds,
    selectedSeatClientIdSet,
    errorSeatClientIds,
    collisionMapRef,
    canUndo,
    setSelectedSeatClientIds,
    saveLayoutSnapshot,
    handleUndo,
    handleAddSeat,
    handleAddSeats,
    handleRemoveSelectedSeats,
    updateVenueSeat,
  };
};
