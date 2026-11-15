import { useState } from "react";
import toast from "react-hot-toast";
import { generatePath, useNavigate } from "react-router";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { apiClient } from "@shared/api";
import { ROUTE_PATHS } from "@shared/config/router.config";

import { GROUP_QUERY_KEYS, createGroupRequestError, useCurrentGroup } from "@entities/group";

interface UsePerformanceGroupPanelProps {
  performanceId: number;
}

export const usePerformanceGroupPanel = ({ performanceId }: UsePerformanceGroupPanelProps) => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const groupQuery = useCurrentGroup(performanceId);
  const [inviteCode, setInviteCode] = useState("");

  const openGroup = (group: NonNullable<typeof groupQuery.data>) => {
    queryClient.setQueryData(GROUP_QUERY_KEYS.current(group.performanceId), group);
    queryClient.setQueryData(GROUP_QUERY_KEYS.detail(group.groupId), group);
    navigate(generatePath(ROUTE_PATHS.GROUP_DETAIL, { groupId: String(group.groupId) }));
  };

  const createMutation = useMutation({
    mutationFn: async () => {
      const { data, error, response } = await apiClient.POST("/api/groups", { body: { performanceId } });
      if (!response.ok || error || !data) throw createGroupRequestError(error, response.status, "그룹을 만들지 못했습니다.");
      return data.data;
    },
    onSuccess: openGroup,
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "그룹을 만들지 못했습니다.");
    },
  });

  const joinMutation = useMutation({
    mutationFn: async () => {
      const { data, error, response } = await apiClient.POST("/api/groups/join", { body: { inviteCode: inviteCode.trim() } });
      if (!response.ok || error || !data) throw createGroupRequestError(error, response.status, "그룹에 참여하지 못했습니다.");
      return data.data;
    },
    onSuccess: openGroup,
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "그룹에 참여하지 못했습니다.");
    },
  });

  const handleOpenGroup = () => {
    if (!groupQuery.data) return;
    queryClient.setQueryData(GROUP_QUERY_KEYS.detail(groupQuery.data.groupId), groupQuery.data);
    navigate(generatePath(ROUTE_PATHS.GROUP_DETAIL, { groupId: String(groupQuery.data.groupId) }));
  };

  return {
    group: groupQuery.data,
    isLoading: groupQuery.isPending,
    isError: groupQuery.isError,
    isCreating: createMutation.isPending,
    isJoining: joinMutation.isPending,
    inviteCode,
    handleInviteCodeChange: setInviteCode,
    handleCreateGroup: () => createMutation.mutate(),
    handleJoinGroup: () => joinMutation.mutate(),
    handleOpenGroup,
    handleRefresh: () => void groupQuery.refetch(),
  };
};
