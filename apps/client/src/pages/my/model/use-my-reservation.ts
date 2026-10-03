import { useMemo } from "react";

import { useMyReservation as useMyReservationQuery } from "@entities/reservation";
import { useVenues } from "@entities/venue";

import { useMyReservationFilter } from "./use-my-reservation-filter";

export const useMyReservation = () => {
  const reservationQuery = useMyReservationQuery();
  const reservationFilter = useMyReservationFilter({ reservations: reservationQuery.data ?? [] });
  const venuesQuery = useVenues(Boolean(reservationQuery.data?.length));
  const venueAddressById = useMemo(() => new Map(venuesQuery.data?.map(({ id, address }) => [id, address]) ?? []), [venuesQuery.data]);

  return {
    ...reservationQuery,
    ...reservationFilter,
    venueAddressById,
  };
};
