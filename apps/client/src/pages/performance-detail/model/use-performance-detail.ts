import { useParams } from "react-router";

import { useConcertDetail } from "@entities/concert";
import { usePerformanceDetail as usePerformanceDetailQuery } from "@entities/performance";

export const usePerformanceDetail = () => {
  const { performanceId } = useParams();
  const id = Number(performanceId);
  const isParamValid = Number.isInteger(id) && id > 0;

  const { data: performanceData, isError: performanceIsError, isPending: performanceIsPending } = usePerformanceDetailQuery(id);
  const { data: concertData, isError: concertIsError, isPending: concertIsPending } = useConcertDetail(performanceData?.performance.concertId ?? 0);

  return {
    isParamValid,
    concert: concertData?.concert,
    performance: performanceData?.performance,
    seats: performanceData?.seats,
    isError: performanceIsError || concertIsError,
    isPending: performanceIsPending || concertIsPending,
  };
};
