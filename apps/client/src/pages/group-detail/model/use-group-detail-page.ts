import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { generatePath, useNavigate, useParams, useSearchParams } from "react-router";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { apiClient } from "@shared/api";
import { ROUTE_PATHS } from "@shared/config/router.config";

import { GROUP_QUERY_KEYS, GroupApiError, createGroupRequestError, useGroup } from "@entities/group";
import { usePerformanceDetail } from "@entities/performance";
import { useSessionStore } from "@entities/session";

export const useGroupDetailPage = () => {
  const { groupId: groupIdParam } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const currentUser = useSessionStore((state) => state.user);
  const groupId = Number(groupIdParam);
  const isParamValid = Number.isInteger(groupId) && groupId > 0;
  const inviteCode = searchParams.get("inviteCode");
  const groupQuery = useGroup(groupId, isParamValid);
  const group = groupQuery.data;
  const performanceQuery = usePerformanceDetail(group?.performanceId ?? 0);
  const attemptedJoinRef = useRef(false);
  const [confirmation, setConfirmation] = useState<{ type: "leave" } | { type: "kick"; memberUserId: number; nickname: string } | null>(null);

  const joinMutation = useMutation({
    mutationFn: async () => {
      const { data, error, response } = await apiClient.POST("/api/groups/{groupId}/join", {
        params: { path: { groupId } },
        body: { inviteCode: inviteCode ?? "" },
      });
      if (!response.ok || error || !data) throw createGroupRequestError(error, response.status, "그룹에 참여하지 못했습니다.");
      return data.data;
    },
    onSuccess: (membership) => {
      queryClient.setQueryData(GROUP_QUERY_KEYS.detail(groupId), membership);
      queryClient.setQueryData(GROUP_QUERY_KEYS.current(membership.performanceId), membership);
      void queryClient.invalidateQueries({ queryKey: GROUP_QUERY_KEYS.current(membership.performanceId) });
      setSearchParams({}, { replace: true });
      toast.success("그룹에 참여했습니다.");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "그룹에 참여하지 못했습니다.");
    },
  });
  const { mutate: requestJoin } = joinMutation;

  useEffect(() => {
    if (
      !isParamValid ||
      !inviteCode ||
      !groupQuery.isError ||
      !(groupQuery.error instanceof GroupApiError) ||
      groupQuery.error.status !== 403 ||
      attemptedJoinRef.current
    ) {
      return;
    }

    attemptedJoinRef.current = true;
    requestJoin();
  }, [groupQuery.error, groupQuery.isError, inviteCode, isParamValid, requestJoin]);

  useEffect(() => {
    if (inviteCode && groupQuery.isSuccess) {
      setSearchParams({}, { replace: true });
    }
  }, [groupQuery.isSuccess, inviteCode, setSearchParams]);

  const kickMutation = useMutation({
    mutationFn: async (memberUserId: number) => {
      const { data, error, response } = await apiClient.DELETE("/api/groups/{groupId}/members/{memberUserId}", {
        params: { path: { groupId, memberUserId } },
      });
      if (!response.ok || error || !data) throw createGroupRequestError(error, response.status, "그룹원을 내보내지 못했습니다.");
      return data.data;
    },
    onSuccess: (membership) => {
      queryClient.setQueryData(GROUP_QUERY_KEYS.detail(groupId), membership);
      queryClient.setQueryData(GROUP_QUERY_KEYS.current(membership.performanceId), membership);
      toast.success("그룹원을 내보냈습니다.");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "그룹원을 내보내지 못했습니다.");
    },
  });

  const leaveMutation = useMutation({
    mutationFn: async () => {
      const { data, error, response } = await apiClient.DELETE("/api/groups/{groupId}/leave", { params: { path: { groupId } } });
      if (!response.ok || error || !data) throw createGroupRequestError(error, response.status, "그룹에서 나가지 못했습니다.");
      return data.data;
    },
    onSuccess: (membership) => {
      queryClient.setQueryData(GROUP_QUERY_KEYS.current(membership.performanceId), null);
      queryClient.removeQueries({ queryKey: GROUP_QUERY_KEYS.detail(groupId) });
      toast.success("그룹에서 나왔습니다.");
      navigate(generatePath(ROUTE_PATHS.PERFORMANCE_DETAIL, { performanceId: String(membership.performanceId) }));
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "그룹에서 나가지 못했습니다.");
    },
  });

  const handleKickMember = (memberUserId: number, nickname: string) => {
    if (!group || group.leaderUserId !== currentUser?.id || memberUserId === currentUser.id) return;
    setConfirmation({ type: "kick", memberUserId, nickname });
  };

  const handleLeaveGroup = () => setConfirmation({ type: "leave" });

  const handleConfirmAction = () => {
    if (!confirmation) return;
    if (confirmation.type === "leave") leaveMutation.mutate();
    else kickMutation.mutate(confirmation.memberUserId);
    setConfirmation(null);
  };

  const inviteLink = group
    ? new URL(
        `${generatePath(ROUTE_PATHS.GROUP_DETAIL, { groupId: String(group.groupId) })}?inviteCode=${encodeURIComponent(group.inviteCode)}`,
        window.location.origin,
      ).toString()
    : "";

  const handleCopyInviteLink = async () => {
    try {
      await navigator.clipboard.writeText(inviteLink);
      toast.success("초대 링크를 복사했습니다.");
    } catch {
      toast.error("링크를 복사하지 못했습니다. 입력란에서 직접 복사해 주세요.");
    }
  };

  const handleCopyInviteCode = async () => {
    if (!group) return;
    try {
      await navigator.clipboard.writeText(group.inviteCode.toUpperCase());
      toast.success("초대 코드를 복사했습니다.");
    } catch {
      toast.error("초대 코드를 복사하지 못했습니다.");
    }
  };

  return {
    confirmation,
    handleConfirmAction,
    handleDismissConfirmation: () => setConfirmation(null),
    currentUser,
    group,
    performance: performanceQuery.data,
    isParamValid,
    isError: groupQuery.isError && !joinMutation.isPending,
    isPending: groupQuery.isPending || joinMutation.isPending,
    errorMessage: joinMutation.error?.message ?? groupQuery.error?.message,
    inviteLink,
    isLeader: group?.leaderUserId === currentUser?.id,
    isKicking: kickMutation.isPending,
    isLeaving: leaveMutation.isPending,
    handleCopyInviteLink,
    handleCopyInviteCode,
    handleKickMember,
    handleLeaveGroup,
    handleRefresh: () => void groupQuery.refetch(),
  };
};
