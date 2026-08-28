import { useQuery } from "@tanstack/react-query";

import { apiClient } from "@shared/api";

import { VENUE_QUERY_KEYS } from "./venue.constants";

export const useVenues = () =>
  useQuery({
    queryKey: VENUE_QUERY_KEYS.all,
    queryFn: async () => {
      const { data, error, response } = await apiClient.GET("/api/venues");

      if (!response.ok || error || !data) {
        throw new Error("공연장 정보를 불러오지 못했습니다.");
      }

      return data.data;
    },
  });
