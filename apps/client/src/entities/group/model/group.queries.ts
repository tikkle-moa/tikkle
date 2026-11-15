import { useQuery } from "@tanstack/react-query";

import { apiClient } from "@shared/api";

import { GROUP_QUERY_KEYS } from "./group.constants";
import { createGroupRequestError } from "./group.utils";

export const useCurrentGroup = (performanceId: number, enabled = true) =>
  useQuery({
    queryKey: GROUP_QUERY_KEYS.current(performanceId),
    enabled: enabled && Number.isInteger(performanceId) && performanceId > 0,
    queryFn: async () => {
      const { data, error, response } = await apiClient.GET("/api/groups/current", {
        params: { query: { performanceId } },
      });

      if (!response.ok || error || !data) {
        throw createGroupRequestError(error, response.status, "현재 그룹 정보를 불러오지 못했습니다.");
      }

      return data.data;
    },
    staleTime: 0,
    refetchOnWindowFocus: true,
  });

export const useGroup = (groupId: number, enabled = true) =>
  useQuery({
    queryKey: GROUP_QUERY_KEYS.detail(groupId),
    enabled: enabled && Number.isInteger(groupId) && groupId > 0,
    queryFn: async () => {
      const { data, error, response } = await apiClient.GET("/api/groups/{groupId}", {
        params: { path: { groupId } },
      });

      if (!response.ok || error || !data) {
        throw createGroupRequestError(error, response.status, "그룹 정보를 불러오지 못했습니다.");
      }

      return data.data;
    },
    staleTime: 0,
    refetchOnWindowFocus: true,
  });
