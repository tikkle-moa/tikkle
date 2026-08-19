import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";

import { apiClient } from "@shared/api";
import { ROUTE_PATHS } from "@shared/config/router.config";

import type { CreateConcertRequest } from "@entities/concert";

export const useConcertEdit = () => {
  const { concertId } = useParams();
  const navigate = useNavigate();

  const [initialValues, setInitialValues] = useState<CreateConcertRequest | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const id = Number(concertId);
  const isParamValid = Number.isInteger(id) && id > 0;

  useEffect(() => {
    if (!isParamValid) {
      return;
    }

    const fetchConcert = async () => {
      setInitialValues(null);
      try {
        const { data, error, response } = await apiClient.GET(`/api/concerts/{id}`, { params: { path: { id } } });
        if (!response.ok || error) {
          console.error("Failed to fetch concert data:", error);
          return;
        }

        setInitialValues(data.data.concert);
      } catch (error) {
        console.error(error);
      }
    };

    fetchConcert();
  }, [id, isParamValid]);

  const handleSubmit = async (values: CreateConcertRequest) => {
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const changedValues = Object.fromEntries(
        Object.entries(values).filter(([key, value]) => value !== initialValues?.[key as keyof CreateConcertRequest]),
      ) as Partial<CreateConcertRequest>;
      const { error, response } = await apiClient.PATCH(`/api/concerts/{id}`, { params: { path: { id } }, body: changedValues });

      if (!response.ok || error) {
        setSubmitError("콘서트 수정에 실패했습니다.");
        return;
      }

      navigate(ROUTE_PATHS.CONCERT_LIST);
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
    isParamValid,
    initialValues,
    isSubmitting,
    submitError,
    handleSubmit,
    handleCancel,
  };
};
