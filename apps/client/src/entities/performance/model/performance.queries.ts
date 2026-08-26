import { useQuery } from "@tanstack/react-query";

import { apiClient } from "@shared/api";

import { PERFORMANCE_QUERY_KEYS } from "./performance.constants";

export const usePerformanceDetail = (performanceId: number) =>
  useQuery({
    queryKey: PERFORMANCE_QUERY_KEYS.detail(performanceId),
    enabled: Number.isInteger(performanceId) && performanceId > 0,
    queryFn: async () => {
      const { data, error, response } = await apiClient.GET("/api/performances/{id}", { params: { path: { id: performanceId } } });

      if (!response.ok || error || !data) {
        throw new Error("공연 회차 상세 정보를 불러오지 못했습니다.");
      }

      return data.data;
    },
  });
