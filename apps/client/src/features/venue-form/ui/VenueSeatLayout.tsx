import { type PointerEvent, memo, useMemo } from "react";

import VenueSeatBaseLayer from "./VenueSeatBaseLayer";
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
  const seatByClientId = useMemo(() => new Map(venueSeats.map((seat) => [seat.clientId, seat])), [venueSeats]);
  const emphasizedClientIds = useMemo(
    () => [...errorSeatClientIds].filter((clientId) => !selectedSeatClientIdSet.has(clientId)).concat([...selectedSeatClientIdSet]),
    [errorSeatClientIds, selectedSeatClientIdSet],
  );

  return (
    <g onPointerDown={onPointerDown}>
      <VenueSeatBaseLayer venueSeats={venueSeats} isSubmitting={isSubmitting} />
      {emphasizedClientIds.map((clientId) => {
        const seat = seatByClientId.get(clientId);
        if (!seat) return null;
        return (
          <VenueSeatItem
            key={clientId}
            seat={seat}
            selected={selectedSeatClientIdSet.has(clientId)}
            hasError={errorSeatClientIds.has(clientId)}
            isSubmitting={isSubmitting}
          />
        );
      })}
    </g>
  );
};

export default memo(VenueSeatLayout);
