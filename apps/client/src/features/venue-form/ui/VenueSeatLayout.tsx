import { type PointerEvent, memo } from "react";

import { VENUE_SEAT_HEIGHT, VENUE_SEAT_RADIUS, VENUE_SEAT_WIDTH } from "@entities/venue";

import type { VenueFormSeat } from "../model/venue-form.types";
import { getSectionColor } from "../model/venue-layout.utils";

interface VenueSeatLayoutProps {
  venueSeats: VenueFormSeat[];
  selectedSeatClientIdSet: Set<number>;
  errorSeatClientIds: Set<number>;
  isSubmitting: boolean;
  startSeatDrag: (event: PointerEvent<SVGElement>, clientId: number) => void;
}

const VenueSeatLayout = ({ venueSeats, selectedSeatClientIdSet, errorSeatClientIds, isSubmitting, startSeatDrag }: VenueSeatLayoutProps) => {
  const orderedSeats = venueSeats
    .map((seat) => ({
      seat,
      selected: selectedSeatClientIdSet.has(seat.clientId),
      hasError: errorSeatClientIds.has(seat.clientId),
    }))
    .sort((first, second) => Number(first.selected || first.hasError) - Number(second.selected || second.hasError));

  return (
    <>
      {orderedSeats.map(({ seat, selected, hasError }) => (
        <g
          className={isSubmitting ? "" : "cursor-grab active:cursor-grabbing"}
          key={seat.clientId}
          onPointerDown={(event) => startSeatDrag(event, seat.clientId)}
        >
          <rect
            x={seat.positionX - VENUE_SEAT_WIDTH / 2}
            y={seat.positionY - VENUE_SEAT_HEIGHT / 2}
            width={VENUE_SEAT_WIDTH}
            height={VENUE_SEAT_HEIGHT}
            rx={VENUE_SEAT_RADIUS}
            fill={getSectionColor(seat.sectionName)}
            stroke={hasError ? "#f87171" : selected ? "#fef3c7" : "#e2e8f0"}
            strokeWidth={hasError || selected ? 0.6 : 0.3}
          />

          <title>
            {seat.seatLabel || `좌석 ${seat.clientId}`} ({seat.positionX}, {seat.positionY})
          </title>
        </g>
      ))}
    </>
  );
};

export default memo(VenueSeatLayout);
