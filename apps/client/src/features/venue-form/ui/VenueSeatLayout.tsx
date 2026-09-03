import { type PointerEvent, memo } from "react";

import VenueSeatItem from "./VenueSeatItem";

import type { VenueFormSeat } from "../model/venue-form.types";

interface VenueSeatLayoutProps {
  venueSeats: VenueFormSeat[];
  selectedSeatClientIdSet: Set<number>;
  errorSeatClientIds: Set<number>;
  isSubmitting: boolean;
  onPointerDown: (event: PointerEvent<SVGGElement>) => void;
}

const VenueSeatLayout = ({ venueSeats, selectedSeatClientIdSet, errorSeatClientIds, isSubmitting, onPointerDown }: VenueSeatLayoutProps) => {
  const regularSeats: VenueFormSeat[] = [];
  const errorSeats: VenueFormSeat[] = [];
  const selectedSeats: VenueFormSeat[] = [];

  venueSeats.forEach((seat) => {
    if (selectedSeatClientIdSet.has(seat.clientId)) {
      selectedSeats.push(seat);
    } else if (errorSeatClientIds.has(seat.clientId)) {
      errorSeats.push(seat);
    } else {
      regularSeats.push(seat);
    }
  });

  const orderedSeats = [...regularSeats, ...errorSeats, ...selectedSeats];

  return (
    <g onPointerDown={onPointerDown}>
      {orderedSeats.map((seat) => {
        const selected = selectedSeatClientIdSet.has(seat.clientId);
        const hasError = errorSeatClientIds.has(seat.clientId);

        return <VenueSeatItem key={seat.clientId} seat={seat} selected={selected} hasError={hasError} isSubmitting={isSubmitting} />;
      })}
    </g>
  );
};

export default memo(VenueSeatLayout);
