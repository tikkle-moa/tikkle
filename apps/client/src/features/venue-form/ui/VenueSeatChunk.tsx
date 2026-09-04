import { memo } from "react";

import type { VenueFormSeat } from "../model/venue-form.types";
import { getSeatPath, getSectionColor } from "../model/venue-layout.utils";

interface VenueSeatChunkProps {
  seats: VenueFormSeat[];
  isSubmitting: boolean;
}

const VenueSeatChunk = ({ seats, isSubmitting }: VenueSeatChunkProps) => {
  const pathsByColor = new Map<string, string>();
  seats.forEach((seat) => {
    const color = getSectionColor(seat.sectionName);
    pathsByColor.set(color, `${pathsByColor.get(color) ?? ""}${getSeatPath(seat)}`);
  });

  return (
    <g className={isSubmitting ? "" : "cursor-grab active:cursor-grabbing"} pointerEvents="none">
      {[...pathsByColor].map(([color, path]) => (
        <path key={color} d={path} fill={color} stroke="#e2e8f0" strokeWidth={0.3} />
      ))}
    </g>
  );
};

export default memo(VenueSeatChunk, (previous, next) => {
  return (
    previous.isSubmitting === next.isSubmitting &&
    previous.seats.length === next.seats.length &&
    previous.seats.every((seat, index) => seat === next.seats[index])
  );
});
