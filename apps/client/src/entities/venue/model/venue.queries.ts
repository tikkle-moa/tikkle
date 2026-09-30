import { useQuery } from "@tanstack/react-query";

import { apiClient } from "@shared/api";

import { VENUE_QUERY_KEYS } from "./venue.constants";

export const useVenues = (enabled = true) =>
  useQuery({
    queryKey: VENUE_QUERY_KEYS.all,
    enabled,
    queryFn: async () => {
      const { data, error, response } = await apiClient.GET("/api/venues");

      if (!response.ok || error || !data) {
        throw new Error("공연장 정보를 불러오지 못했습니다.");
      }

      return data.data;
    },
  });

export const useVenueDetail = (venueId: number, enabled = true) =>
  useQuery({
    queryKey: VENUE_QUERY_KEYS.detail(venueId),
    enabled: enabled && Number.isInteger(venueId) && venueId > 0,
    queryFn: async () => {
      const { data, error, response } = await apiClient.GET("/api/venues/{id}", {
        params: { path: { id: venueId } },
      });

      if (!response.ok || error || !data) {
        throw new Error("공연장 상세 정보를 불러오지 못했습니다.");
      }

      return data.data;
    },
  });
