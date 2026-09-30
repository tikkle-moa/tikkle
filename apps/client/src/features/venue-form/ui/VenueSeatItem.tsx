import { memo } from "react";

import { VENUE_SEAT_HEIGHT, VENUE_SEAT_RADIUS, VENUE_SEAT_WIDTH } from "@entities/venue";

import type { VenueFormSeat } from "../model/venue-form.types";
import { getSectionColor } from "../model/venue-layout.utils";

interface VenueSeatItemProps {
  seat: VenueFormSeat;
  selected: boolean;
  hasError: boolean;
  isSubmitting: boolean;
}

const VenueSeatItem = ({ seat, selected, hasError, isSubmitting }: VenueSeatItemProps) => {
  return (
    <g className={isSubmitting ? "" : "cursor-grab active:cursor-grabbing"} data-seat-client-id={seat.clientId}>
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
  );
};

export default memo(VenueSeatItem);
