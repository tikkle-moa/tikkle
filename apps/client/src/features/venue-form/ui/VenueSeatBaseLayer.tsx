import { memo, useMemo } from "react";

import VenueSeatChunk from "./VenueSeatChunk";

import type { VenueFormSeat } from "../model/venue-form.types";
import { VENUE_SEAT_CHUNK_SIZE } from "../model/venue-layout.constants";

interface VenueSeatBaseLayerProps {
  venueSeats: VenueFormSeat[];
  isSubmitting: boolean;
}

const VenueSeatBaseLayer = ({ venueSeats, isSubmitting }: VenueSeatBaseLayerProps) => {
  const seatsByChunkKey = useMemo(() => {
    const chunks = new Map<number, VenueFormSeat[]>();
    venueSeats.forEach((seat) => {
      const chunkKey = Math.floor(seat.clientId / VENUE_SEAT_CHUNK_SIZE);
      const chunkSeats = chunks.get(chunkKey);
      if (chunkSeats) chunkSeats.push(seat);
      else chunks.set(chunkKey, [seat]);
    });
    return chunks;
  }, [venueSeats]);

  return (
    <>
      {[...seatsByChunkKey].map(([chunkKey, seats]) => (
        <VenueSeatChunk key={chunkKey} seats={seats} isSubmitting={isSubmitting} />
      ))}
    </>
  );
};

export default memo(VenueSeatBaseLayer);
