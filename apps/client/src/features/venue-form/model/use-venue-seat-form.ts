import { type Dispatch, type RefObject, type SetStateAction, useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { CreateVenueRequest, CreateVenueSeatRequest } from "@entities/venue";

import type { VenueFormErrors, VenueFormSeat } from "./venue-form.types";
import { createVenueSeat } from "./venue-form.utils";

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
  const historyRef = useRef<VenueFormSeat[][]>([]);
  const [canUndo, setCanUndo] = useState(false);

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

  const saveLayoutSnapshot = () => {
    historyRef.current = [...historyRef.current.slice(-49), venueSeats.map((seat) => ({ ...seat }))];
    setCanUndo(true);
  };

  const handleUndo = useCallback(() => {
    const snapshot = historyRef.current.at(-1);
    if (!snapshot) return;
    historyRef.current = historyRef.current.slice(0, -1);
    setVenueSeats(snapshot);
    setCanUndo(historyRef.current.length > 0);
    setSelectedSeatClientIds([]);
  }, [setVenueSeats]);

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
    setVenueSeats((current) => [...current, createVenueSeat(venue.width, venue.height, nextClientId)]);
    setSelectedSeatClientIds([nextClientId]);
  };

  const handleAddSeats = (seats: VenueFormSeat[]) => {
    saveLayoutSnapshot();
    setVenueSeats((current) => [...current, ...seats]);
  };

  const handleRemoveSelectedSeats = () => {
    if (selectedSeatClientIds.length === 0) return;
    saveLayoutSnapshot();
    const selectedSet = new Set(selectedSeatClientIds);
    setVenueSeats((current) => current.filter((seat) => !selectedSet.has(seat.clientId)));
    setSelectedSeatClientIds([]);
  };

  const updateVenueSeat = <K extends keyof CreateVenueSeatRequest>(clientId: number, field: K, value: CreateVenueSeatRequest[K]) => {
    saveLayoutSnapshot();
    setVenueSeats((current) => current.map((seat) => (seat.clientId === clientId ? { ...seat, [field]: value } : seat)));
    setErrors(({ [`seat.${clientId}.${field}`]: _, ...next }) => next);
  };

  return {
    selectedSeatClientIds,
    errorSeatClientIds,
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
