import { useQuery } from "@tanstack/react-query";

import { apiClient } from "@shared/api";

import { CONCERT_QUERY_KEYS } from "./concert.constants";

export const useConcerts = () =>
  useQuery({
    queryKey: CONCERT_QUERY_KEYS.all,
    queryFn: async () => {
      const { data, error, response } = await apiClient.GET("/api/concerts");

      if (!response.ok || error || !data) {
        throw new Error("콘서트 상세 정보를 불러오지 못했습니다.");
      }

      return data.data;
    },
  });

/**
 * 현재 API 서버가 미구현 상태이므로 queryFn은 임시로 콘서트 전체 조회 API를 호출하도록 설정되어 있습니다.
 * API 서버가 구현되면 queryFn을 실제 API 호출로 교체하면 됩니다.
 */
export const useUpcomingConcerts = () =>
  useQuery({
    queryKey: CONCERT_QUERY_KEYS.upcoming(),
    queryFn: async () => {
      const { data, error, response } = await apiClient.GET("/api/concerts");

      if (!response.ok || error || !data) {
        throw new Error("콘서트 상세 정보를 불러오지 못했습니다.");
      }

      return data.data;
    },
  });

/**
 * 현재 API 서버가 미구현 상태이므로 queryFn은 임시로 콘서트 전체 조회 API를 호출하도록 설정되어 있습니다.
 * API 서버가 구현되면 queryFn을 실제 API 호출로 교체하면 됩니다.
 */
export const useHotConcerts = () =>
  useQuery({
    queryKey: CONCERT_QUERY_KEYS.hot(),
    queryFn: async () => {
      const { data, error, response } = await apiClient.GET("/api/concerts");

      if (!response.ok || error || !data) {
        throw new Error("콘서트 상세 정보를 불러오지 못했습니다.");
      }

      return data.data;
    },
  });

/**
 * 현재 API 서버가 미구현 상태이므로 queryFn은 임시로 콘서트 전체 조회 API를 호출하도록 설정되어 있습니다.
 * API 서버가 구현되면 queryFn을 실제 API 호출로 교체하면 됩니다.
 */
export const useDailyRankings = () =>
  useQuery({
    queryKey: CONCERT_QUERY_KEYS.dailyRankings(),
    queryFn: async () => {
      const { data, error, response } = await apiClient.GET("/api/concerts");

      if (!response.ok || error || !data) {
        throw new Error("콘서트 상세 정보를 불러오지 못했습니다.");
      }

      return data.data;
    },
  });

export const useConcertDetail = (concertId: number) =>
  useQuery({
    queryKey: CONCERT_QUERY_KEYS.detail(concertId),
    enabled: Number.isInteger(concertId) && concertId > 0,
    queryFn: async () => {
      const { data, error, response } = await apiClient.GET("/api/concerts/{id}", {
        params: { path: { id: concertId } },
      });

      if (!response.ok || error || !data) {
        throw new Error("콘서트 상세 정보를 불러오지 못했습니다.");
      }

      return data.data;
    },
  });
