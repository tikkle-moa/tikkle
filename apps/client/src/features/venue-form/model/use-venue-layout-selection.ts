import { useMemo } from "react";

import { VENUE_SEAT_HEIGHT, VENUE_SEAT_WIDTH } from "@entities/venue";

import type { VenueFormSeat } from "./venue-form.types";

interface UseVenueLayoutSelectionProps {
  venueSeats: VenueFormSeat[];
  selectedSeatClientIds: number[];
}

export const useVenueLayoutSelection = ({ venueSeats, selectedSeatClientIds }: UseVenueLayoutSelectionProps) => {
  const selectedSet = useMemo(() => new Set(selectedSeatClientIds), [selectedSeatClientIds]);

  const selectedBounds = useMemo(() => {
    const selectedSeats = venueSeats.filter((seat) => selectedSet.has(seat.clientId));
    if (selectedSeats.length === 0) return null;

    return {
      left: Math.min(...selectedSeats.map((seat) => seat.positionX)) - VENUE_SEAT_WIDTH / 2,
      right: Math.max(...selectedSeats.map((seat) => seat.positionX)) + VENUE_SEAT_WIDTH / 2,
      top: Math.min(...selectedSeats.map((seat) => seat.positionY)) - VENUE_SEAT_HEIGHT / 2,
      bottom: Math.max(...selectedSeats.map((seat) => seat.positionY)) + VENUE_SEAT_HEIGHT / 2,
    };
  }, [venueSeats, selectedSet]);

  return {
    selectedSet,
    selectedBounds,
  };
};
