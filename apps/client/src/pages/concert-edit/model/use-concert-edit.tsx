import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { useNavigate, useParams } from "react-router";

import { apiClient } from "@shared/api";
import { ROUTE_PATHS } from "@shared/config/router.config";

import type { CreateConcertRequest } from "@entities/concert";

import type { SubmitState } from "@features/concert-form";

import type { LoadState } from "./concert-edit.types";

export const useConcertEdit = () => {
  const { concertId } = useParams();
  const id = Number(concertId);
  const isParamValid = Number.isInteger(id) && id > 0;

  const [loadState, setLoadState] = useState<LoadState>({ status: "loading" });
  const [submitState, setSubmitState] = useState<SubmitState>({ status: "idle" });

  const navigate = useNavigate();

  useEffect(() => {
    const fetchConcert = async () => {
      if (!isParamValid) {
        setLoadState({ status: "error", error: "잘못된 콘서트 ID입니다." });
        return;
      }

      setLoadState({ status: "loading" });
      try {
        const { data, error, response } = await apiClient.GET(`/api/concerts/{id}`, { params: { path: { id } } });
        if (!response.ok || error) {
          setLoadState({ status: "error", error: "콘서트 정보를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요." });
          return;
        }

        setLoadState({ status: "success", data: data.data.concert });
      } catch {
        setLoadState({ status: "error", error: "콘서트 정보를 불러오는 중 오류가 발생했습니다." });
      }
    };

    fetchConcert();
  }, [id, isParamValid]);

  const handleSubmit = async (values: CreateConcertRequest) => {
    if (loadState.status !== "success") {
      setSubmitState({ status: "error", error: "콘서트 정보를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요." });
      return;
    }

    setSubmitState({ status: "submitting" });
    try {
      const changedValues = Object.fromEntries(
        Object.entries(values).filter(([key, value]) => value !== loadState.data[key as keyof CreateConcertRequest]),
      ) as Partial<CreateConcertRequest>;
      const { error, response } = await apiClient.PATCH(`/api/concerts/{id}`, { params: { path: { id } }, body: changedValues });

      if (!response.ok || error) {
        setSubmitState({ status: "error", error: "콘서트 수정에 실패했습니다." });
        return;
      }

      toast.success(`"${values.title}" 콘서트 수정이 완료되었습니다.`);
      navigate(ROUTE_PATHS.CONCERT_LIST);
    } catch {
      setSubmitState({ status: "error", error: "콘서트 수정 중 오류가 발생했습니다." });
    }
  };

  const handleCancel = () => {
    navigate(ROUTE_PATHS.CONCERT_LIST);
  };

  return {
    loadState,
    submitState,
    handleSubmit,
    handleCancel,
  };
};
