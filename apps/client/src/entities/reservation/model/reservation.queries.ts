import { useQuery } from "@tanstack/react-query";

import { apiClient } from "@shared/api";

import { RESERVATION_QUERY_KEYS } from "./reservation.constants";

export const useMyReservations = () =>
  useQuery({
    queryKey: RESERVATION_QUERY_KEYS.my(),
    queryFn: async () => {
      const { data, error, response } = await apiClient.GET("/api/reservations");

      if (!response.ok || error || !data) {
        throw new Error("내 예매 목록을 불러오지 못했습니다.");
      }

      return data.data;
    },
  });
