import { useParams } from "react-router";

import { usePerformanceDetail as usePerformanceDetailQuery } from "@entities/performance";

export const usePerformanceDetail = () => {
  const { performanceId } = useParams();
  const id = Number(performanceId);
  const isParamValid = Number.isInteger(id) && id > 0;

  const { data, isError, isPending } = usePerformanceDetailQuery(id);

  return {
    isParamValid,
    performance: data,
    seats: [],
    isError,
    isPending,
  };
};
