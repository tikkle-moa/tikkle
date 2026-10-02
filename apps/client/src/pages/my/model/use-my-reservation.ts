import { useMyReservation as useMyReservationQuery } from "@entities/reservation";

import { useMyReservationFilter } from "./use-my-reservation-filter";

export const useMyReservation = () => {
  const reservationQuery = useMyReservationQuery();
  const reservationFilter = useMyReservationFilter({ reservations: reservationQuery.data ?? [] });

  return {
    ...reservationQuery,
    ...reservationFilter,
  };
};
