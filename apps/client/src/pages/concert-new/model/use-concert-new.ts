import { useState } from "react";
import { generatePath, useNavigate } from "react-router";

import { apiClient } from "@shared/api";
import { ROUTE_PATHS } from "@shared/config/router.config";

import type { CreateConcertRequest } from "@entities/concert";

export const useConcertNew = () => {
  const navigate = useNavigate();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const handleSubmit = async (values: CreateConcertRequest) => {
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const { data, error, response } = await apiClient.POST("/api/concerts", { body: values });

      if (!response.ok || error || !data) {
        setSubmitError("콘서트 등록에 실패했습니다.");
        return;
      }

      navigate(
        generatePath(ROUTE_PATHS.CONCERT_DETAIL, {
          concertId: String(data.data.id),
        }),
        { replace: true },
      );
    } catch {
      setSubmitError("콘서트 등록 중 오류가 발생했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    navigate(ROUTE_PATHS.CONCERT_LIST);
  };

  return {
    isSubmitting,
    submitError,
    handleSubmit,
    handleCancel,
  };
};
