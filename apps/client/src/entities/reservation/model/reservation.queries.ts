import { useQuery, useQueryClient } from "@tanstack/react-query";

import { apiClient } from "@shared/api";

import { RESERVATION_QUERY_KEYS } from "./reservation.constants";
import type { MyReservation } from "./reservation.types";

interface UseMyReservationDetailProps {
  reservationId: number;
}

export const useMyReservation = () =>
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

export const useMyReservationDetail = ({ reservationId }: UseMyReservationDetailProps) => {
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: RESERVATION_QUERY_KEYS.detail(reservationId),
    enabled: Number.isInteger(reservationId) && reservationId > 0,
    initialData: () => queryClient.getQueryData<MyReservation[]>(RESERVATION_QUERY_KEYS.my())?.find(({ id }) => id === reservationId),
    initialDataUpdatedAt: () => queryClient.getQueryState(RESERVATION_QUERY_KEYS.my())?.dataUpdatedAt,
    queryFn: async () => {
      const { data, error, response } = await apiClient.GET("/api/reservations/{reservationId}", {
        params: { path: { reservationId } },
      });

      if (!response.ok || error || !data) {
        throw new Error("예매 상세 정보를 불러오지 못했습니다.");
      }

      return data.data;
    },
  });
};
