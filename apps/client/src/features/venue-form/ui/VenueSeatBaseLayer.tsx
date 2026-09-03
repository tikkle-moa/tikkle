import { memo } from "react";

import VenueSeatChunk from "./VenueSeatChunk";

import type { VenueFormSeat } from "../model/venue-form.types";
import { VENUE_SEAT_CHUNK_SIZE } from "../model/venue-layout.constants";

interface VenueSeatBaseLayerProps {
  venueSeats: VenueFormSeat[];
  isSubmitting: boolean;
}

const VenueSeatBaseLayer = ({ venueSeats, isSubmitting }: VenueSeatBaseLayerProps) => {
  return (
    <>
      {Array.from({ length: Math.ceil(venueSeats.length / VENUE_SEAT_CHUNK_SIZE) }, (_, chunkIndex) => {
        const startIndex = chunkIndex * VENUE_SEAT_CHUNK_SIZE;
        return (
          <VenueSeatChunk key={chunkIndex} seats={venueSeats.slice(startIndex, startIndex + VENUE_SEAT_CHUNK_SIZE)} isSubmitting={isSubmitting} />
        );
      })}
    </>
  );
};

export default memo(VenueSeatBaseLayer);
