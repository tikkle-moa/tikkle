import { useParams } from "react-router";

import { CONCERT_GENRE_MAP, useConcertDetail as useConcertDetailQuery } from "@entities/concert";
import { getPeriod } from "@entities/performance";
import { USER_ROLE, useSessionStore } from "@entities/session";

export const useConcertDetail = () => {
  const { concertId } = useParams();
  const id = Number(concertId);
  const isParamValid = Number.isInteger(id) && id > 0;
  const isAdmin = useSessionStore((state) => state.user?.role === USER_ROLE.ADMIN);
  const { data, isPending, isError } = useConcertDetailQuery(id);

  const { className: genreClassName, label: genreLabel } = CONCERT_GENRE_MAP[data?.concert?.genre ?? "BALLAD"];
  const period = (data?.performances?.length ?? 0) === 0 ? "회차 준비 중" : getPeriod(data?.performances ?? []);

  return {
    concert: data?.concert,
    performances: data?.performances ?? [],
    genreClassName,
    genreLabel,
    period,
    isAdmin,
    isError,
    isParamValid,
    isPending,
  };
};
