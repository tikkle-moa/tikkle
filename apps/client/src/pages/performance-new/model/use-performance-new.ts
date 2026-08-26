import { generatePath, useNavigate, useParams } from "react-router";

import { ROUTE_PATHS } from "@shared/config/router.config";

import { useConcertDetail } from "@entities/concert";

export const usePerformanceNew = () => {
  const { concertId } = useParams();
  const navigate = useNavigate();

  const id = Number(concertId);
  const isParamValid = Number.isInteger(id) && id > 0;
  const { data, isError, isPending, refetch } = useConcertDetail(id);

  const handleComplete = () => {
    if (!isParamValid) {
      navigate(ROUTE_PATHS.CONCERT_LIST);
      return;
    }

    navigate(
      generatePath(ROUTE_PATHS.CONCERT_DETAIL, {
        concertId: String(id),
      }),
      { replace: true },
    );
  };

  return {
    concertId: id,
    concert: data?.concert,
    performances: data?.performances ?? [],
    isParamValid,
    isPending,
    isError,
    refetch,
    handleComplete,
  };
};
