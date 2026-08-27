import { useState } from "react";
import toast from "react-hot-toast";
import { generatePath, useNavigate } from "react-router";

import { useQueryClient } from "@tanstack/react-query";

import { apiClient } from "@shared/api";
import { ROUTE_PATHS } from "@shared/config/router.config";

import { CONCERT_QUERY_KEYS, type CreateConcertRequest } from "@entities/concert";

import type { SubmitState } from "@features/concert-form";

export const useConcertNew = () => {
  const queryClient = useQueryClient();

  const [submitState, setSubmitState] = useState<SubmitState>({ status: "idle" });

  const navigate = useNavigate();

  const handleSubmit = async (values: CreateConcertRequest) => {
    setSubmitState({ status: "submitting" });
    try {
      const { data, error, response } = await apiClient.POST("/api/concerts", { body: values });

      if (!response.ok || error || !data) {
        setSubmitState({ status: "error", error: "콘서트 등록에 실패했습니다." });
        return;
      }

      queryClient.removeQueries({ queryKey: CONCERT_QUERY_KEYS.all });
      toast.success(`"${values.title}" 콘서트가 등록되었습니다.`);
      navigate(
        generatePath(ROUTE_PATHS.PERFORMANCE_NEW, {
          concertId: String(data.data.id),
        }),
        { replace: true },
      );
    } catch {
      setSubmitState({ status: "error", error: "콘서트 등록 중 오류가 발생했습니다." });
    }
  };

  const handleCancel = () => {
    navigate(ROUTE_PATHS.CONCERT_LIST);
  };

  return {
    submitState,
    handleSubmit,
    handleCancel,
  };
};
