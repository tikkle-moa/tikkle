import { useState } from "react";
import toast from "react-hot-toast";
import { useNavigate } from "react-router";

import { useQueryClient } from "@tanstack/react-query";

import { apiClient } from "@shared/api";
import { ROUTE_PATHS } from "@shared/config/router.config";

import { type CreateVenueDetailRequest, VENUE_QUERY_KEYS } from "@entities/venue";

import type { SubmitState } from "@features/concert-form";

export const useVenueNew = () => {
  const [submitState, setSubmitState] = useState<SubmitState>({ status: "idle" });
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const handleSubmit = async (values: CreateVenueDetailRequest) => {
    setSubmitState({ status: "submitting" });
    try {
      const { data, error, response } = await apiClient.POST("/api/venues", { body: values });
      if (!response.ok || error || !data) {
        setSubmitState({ status: "error", error: "공연장 등록에 실패했습니다. 입력 정보를 확인해 주세요." });
        return;
      }
      await queryClient.invalidateQueries({ queryKey: VENUE_QUERY_KEYS.all });
      toast.success(`"${values.venue.name}" 공연장이 등록되었습니다.`);
      navigate(ROUTE_PATHS.VENUE_LIST, { replace: true });
    } catch {
      setSubmitState({ status: "error", error: "공연장 등록 중 오류가 발생했습니다." });
    }
  };

  return {
    submitState,
    handleSubmit,
    handleCancel: () => navigate(ROUTE_PATHS.VENUE_LIST),
  };
};
