import { useState } from "react";
import { useNavigate } from "react-router";

import { apiClient } from "@shared/api";
import { ROUTE_PATHS } from "@shared/config/router.config";

import type { CreateConcertRequest } from "@entities/concert";

import type { SubmitState } from "@features/concert-form";

export const useConcertNew = () => {
  const [submitState, setSubmitState] = useState<SubmitState>({ status: "idle" });

  const navigate = useNavigate();

  const handleSubmit = async (values: CreateConcertRequest) => {
    setSubmitState({ status: "submitting" });
    try {
      const { response } = await apiClient.POST("/api/concerts", { body: values });

      if (!response.ok) {
        setSubmitState({ status: "error", error: "콘서트 등록에 실패했습니다." });
        return;
      }

      navigate(ROUTE_PATHS.CONCERT_LIST);
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
