import { useParams } from "react-router";

import { useConcertDetail as useConcertDetailQuery } from "@entities/concert";
import { USER_ROLE, useSessionStore } from "@entities/session";

export const useConcertDetail = () => {
  const { concertId } = useParams();
  const id = Number(concertId);
  const isParamValid = Number.isInteger(id) && id > 0;
  const isAdmin = useSessionStore((state) => state.user?.role === USER_ROLE.ADMIN);
  const { data, isPending, isError, refetch } = useConcertDetailQuery(id);

  return {
    concert: data?.concert,
    performances: data?.performances ?? [],
    isAdmin,
    isError,
    isParamValid,
    isPending,
    refetch,
  };
};
