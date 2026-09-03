import { useParams } from "react-router";

import { useVenueDetail as useVenueDetailQuery } from "@entities/venue";

export const useVenueDetail = () => {
  const { venueId } = useParams();
  const id = Number(venueId);
  const isParamValid = Number.isInteger(id) && id > 0;
  const venueQuery = useVenueDetailQuery(id);

  return {
    isParamValid,
    venue: venueQuery.data?.venue,
    venueSeats: venueQuery.data?.venueSeats ?? [],
    isPending: venueQuery.isPending,
    isError: venueQuery.isError,
  };
};
