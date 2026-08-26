import { useState } from "react";
import toast from "react-hot-toast";
import { generatePath, useNavigate, useParams } from "react-router";

import { useQueryClient } from "@tanstack/react-query";

import { apiClient } from "@shared/api";
import { ROUTE_PATHS } from "@shared/config/router.config";

import { CONCERT_QUERY_KEYS } from "@entities/concert";
import type { CreatePerformanceRequest } from "@entities/performance";

import type { PerformanceFormValues, PerformanceSubmitState } from "@features/performance-form";

export const usePerformanceNew = () => {
  const { concertId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const id = Number(concertId);
  const isParamValid = Number.isInteger(id) && id > 0;
  const [submitState, setSubmitState] = useState<PerformanceSubmitState>({
    status: "idle",
  });

  const handleSubmit = async (values: PerformanceFormValues) => {
    if (!isParamValid) return;

    setSubmitState({ status: "submitting" });

    const request: CreatePerformanceRequest = {
      concertId: id,
      startsAt: values.startsAt,
      bookingOpensAt: values.bookingOpensAt || null,
    };

    try {
      const { data, error, response } = await apiClient.POST("/api/performances", { body: request });

      if (!response.ok || error || !data) {
        setSubmitState({
          status: "error",
          error: "공연 회차 등록에 실패했습니다.",
        });
        return;
      }

      queryClient.removeQueries({
        queryKey: CONCERT_QUERY_KEYS.detail(id),
      });
      toast.success("공연 회차를 등록했습니다.");
      navigate(
        generatePath(ROUTE_PATHS.CONCERT_DETAIL, {
          concertId: String(id),
        }),
        { replace: true },
      );
    } catch {
      setSubmitState({
        status: "error",
        error: "공연 회차 등록 중 오류가 발생했습니다.",
      });
    }
  };

  const handleCancel = () => {
    navigate(
      isParamValid
        ? generatePath(ROUTE_PATHS.CONCERT_DETAIL, {
            concertId: String(id),
          })
        : ROUTE_PATHS.CONCERT_LIST,
    );
  };

  return {
    concertId: id,
    isParamValid,
    submitState,
    handleSubmit,
    handleCancel,
  };
};
