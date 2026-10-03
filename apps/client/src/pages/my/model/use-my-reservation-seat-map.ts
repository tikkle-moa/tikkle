import { useMemo, useState } from "react";

import { useConcerts } from "@entities/concert";
import { type MyReservation } from "@entities/reservation";
import { useVenueDetail } from "@entities/venue";

interface UseMyReservationSeatMapProps {
  reservation: MyReservation | undefined;
}

export const useMyReservationSeatMap = ({ reservation }: UseMyReservationSeatMapProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const concertsQuery = useConcerts(isOpen && Boolean(reservation));
  const matchingConcerts = useMemo(
    () =>
      concertsQuery.data?.filter(
        ({ title, venueName }) => title.trim() === reservation?.concertTitle.trim() && venueName.trim() === reservation?.venueName.trim(),
      ) ?? [],
    [concertsQuery.data, reservation?.concertTitle, reservation?.venueName],
  );
  const concert = matchingConcerts.length === 1 ? matchingConcerts[0] : undefined;
  const venueDetailQuery = useVenueDetail(concert?.venueId ?? 0, isOpen && Boolean(concert));
  const selectedSeatIds = useMemo(() => {
    if (!venueDetailQuery.data || !reservation) return new Set<number>();

    const reservationSeatKeys = new Set(reservation.seats.map(({ sectionName, seatLabel }) => `${sectionName}\u0000${seatLabel}`));

    return new Set(
      venueDetailQuery.data.venueSeats
        .filter(({ sectionName, seatLabel }) => reservationSeatKeys.has(`${sectionName}\u0000${seatLabel}`))
        .map(({ id }) => id),
    );
  }, [reservation, venueDetailQuery.data]);

  return {
    isOpen,
    open: () => setIsOpen(true),
    close: () => setIsOpen(false),
    isPending: isOpen && (concertsQuery.isPending || (Boolean(concert) && venueDetailQuery.isPending)),
    isError: isOpen && ((concertsQuery.isError && !concertsQuery.data) || (Boolean(concert) && venueDetailQuery.isError && !venueDetailQuery.data)),
    matchingConcertCount: matchingConcerts.length,
    venueDetail: venueDetailQuery.data,
    selectedSeatIds,
    reservationSeatCount: reservation?.seats.length ?? 0,
  };
};
