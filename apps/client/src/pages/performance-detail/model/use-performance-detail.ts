import { useParams } from "react-router";

import { useConcertDetail } from "@entities/concert";
import { usePerformanceDetail as usePerformanceDetailQuery } from "@entities/performance";

export const usePerformanceDetail = () => {
  const { performanceId } = useParams();
  const id = Number(performanceId);
  const isParamValid = Number.isInteger(id) && id > 0;

  const { data: performanceData, isError: isPerformanceError, isPending: isPerformancePending } = usePerformanceDetailQuery(id);
  const { data: concertData, isError: isConcertError, isPending: isConcertPending } = useConcertDetail(performanceData?.performance.concertId ?? 0);

  return {
    isParamValid,
    concert: concertData?.concert,
    performance: performanceData?.performance,
    seats: performanceData?.seats,
    isError: isPerformanceError || (performanceData?.performance != null && isConcertError),
    isPending: isPerformancePending || (performanceData?.performance != null && isConcertPending),
  };
};
