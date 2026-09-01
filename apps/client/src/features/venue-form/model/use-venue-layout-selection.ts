import { useMemo } from "react";

import type { CreateVenueSeatRequest } from "@entities/venue";

import { VENUE_SEAT_HEIGHT, VENUE_SEAT_WIDTH } from "./venue-layout.constants";

interface UseVenueLayoutSelectionProps {
  venueSeats: CreateVenueSeatRequest[];
  selectedSeatIndices: number[];
}

export const useVenueLayoutSelection = ({ venueSeats, selectedSeatIndices }: UseVenueLayoutSelectionProps) => {
  const selectedSet = useMemo(() => new Set(selectedSeatIndices), [selectedSeatIndices]);

  const selectedBounds = useMemo(() => {
    const selectedSeats = selectedSeatIndices.flatMap((index) => (venueSeats[index] ? [venueSeats[index]] : []));
    if (selectedSeats.length === 0) return null;

    return {
      left: Math.min(...selectedSeats.map((seat) => seat.positionX)) - VENUE_SEAT_WIDTH / 2,
      right: Math.max(...selectedSeats.map((seat) => seat.positionX)) + VENUE_SEAT_WIDTH / 2,
      top: Math.min(...selectedSeats.map((seat) => seat.positionY)) - VENUE_SEAT_HEIGHT / 2,
      bottom: Math.max(...selectedSeats.map((seat) => seat.positionY)) + VENUE_SEAT_HEIGHT / 2,
    };
  }, [venueSeats, selectedSeatIndices]);

  return {
    selectedSet,
    selectedBounds,
  };
};
