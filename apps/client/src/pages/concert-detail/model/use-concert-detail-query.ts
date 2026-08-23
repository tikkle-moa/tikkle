import { useQuery } from "@tanstack/react-query";

import { apiClient } from "@shared/api";

import type { ConcertDetailResponse } from "./concert-detail.types";

export const useConcertDetailQuery = (concertId: number) =>
  useQuery<ConcertDetailResponse | null>({
    queryKey: ["concerts", "detail", concertId],
    enabled: Number.isInteger(concertId) && concertId > 0,
    queryFn: async () => {
      const { data, error, response } = await apiClient.GET("/api/concerts/{id}", {
        params: { path: { id: concertId } },
      });

      if (response.status === 404) {
        return null;
      }

      if (!response.ok || error || !data) {
        throw new Error("콘서트 상세 정보를 불러오지 못했습니다.");
      }

      return data.data;
    },
  });
