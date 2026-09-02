import { type Dispatch, type SetStateAction, useCallback, useEffect, useRef, useState } from "react";

import type { CreateVenueDetailRequest, CreateVenueRequest, CreateVenueSeatRequest } from "@entities/venue";

import type { VenueFormErrors } from "./venue-form.types";
import { createVenueSeat } from "./venue-form.utils";

interface UseVenueSeatFormProps {
  venue: CreateVenueRequest;
  venueSeats: CreateVenueSeatRequest[];
  errors: VenueFormErrors;
  setVenue: Dispatch<SetStateAction<CreateVenueRequest>>;
  setVenueSeats: Dispatch<SetStateAction<CreateVenueSeatRequest[]>>;
  setErrors: Dispatch<SetStateAction<VenueFormErrors>>;
}

export const useVenueSeatForm = ({ venue, venueSeats, errors, setVenue, setVenueSeats, setErrors }: UseVenueSeatFormProps) => {
  const [selectedSeatIndices, setSelectedSeatIndices] = useState<number[]>([]);
  const historyRef = useRef<CreateVenueDetailRequest[]>([]);
  const [canUndo, setCanUndo] = useState(false);

  const errorSeatIndices = new Set(
    Object.entries(errors).flatMap(([key, value]) => {
      if (!value) return [];
      const match = key.match(/^seat\.(\d+)\./);
      return match ? [Number(match[1])] : [];
    }),
  );

  const saveLayoutSnapshot = () => {
    historyRef.current = [...historyRef.current.slice(-49), { venue: { ...venue }, venueSeats: venueSeats.map((seat) => ({ ...seat })) }];
    setCanUndo(true);
  };

  const handleUndo = useCallback(() => {
    const snapshot = historyRef.current.at(-1);
    if (!snapshot) return;
    historyRef.current = historyRef.current.slice(0, -1);
    setVenue(snapshot.venue);
    setVenueSeats(snapshot.venueSeats);
    setErrors({});
    setCanUndo(historyRef.current.length > 0);
    setSelectedSeatIndices([]);
  }, [setErrors, setVenue, setVenueSeats]);

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
    setVenueSeats((current) => [...current, createVenueSeat(venue.width, venue.height)]);
    setSelectedSeatIndices([venueSeats.length]);
  };

  const handleAddSeats = (seats: CreateVenueSeatRequest[]) => {
    saveLayoutSnapshot();
    setVenueSeats((current) => [...current, ...seats]);
  };

  const handleRemoveSelectedSeats = () => {
    if (selectedSeatIndices.length === 0) return;
    saveLayoutSnapshot();
    const selectedSet = new Set(selectedSeatIndices);
    setVenueSeats((current) => current.filter((_, seatIndex) => !selectedSet.has(seatIndex)));
    setSelectedSeatIndices([]);
    setErrors({});
  };

  const updateVenueSeat = <K extends keyof CreateVenueSeatRequest>(index: number, field: K, value: CreateVenueSeatRequest[K]) => {
    saveLayoutSnapshot();
    setVenueSeats((current) => current.map((seat, seatIndex) => (seatIndex === index ? { ...seat, [field]: value } : seat)));
    setErrors((current) => ({ ...current, [`seat.${index}.${field}`]: "", venueSeats: "" }));
  };

  return {
    selectedSeatIndices,
    errorSeatIndices,
    canUndo,
    setSelectedSeatIndices,
    saveLayoutSnapshot,
    handleUndo,
    handleAddSeat,
    handleAddSeats,
    handleRemoveSelectedSeats,
    updateVenueSeat,
  };
};
