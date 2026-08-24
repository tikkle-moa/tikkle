import { useEffect, useState } from "react";
import { generatePath, useNavigate, useParams } from "react-router";

import { useQueryClient } from "@tanstack/react-query";

import { apiClient } from "@shared/api";
import { ROUTE_PATHS } from "@shared/config/router.config";

import { CONCERT_QUERY_KEYS, type CreateConcertRequest } from "@entities/concert";

export const useConcertEdit = () => {
  const { concertId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

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
      const { data, error, response } = await apiClient.PATCH(`/api/concerts/{id}`, { params: { path: { id } }, body: changedValues });

      if (!response.ok || error || !data) {
        setSubmitError("콘서트 수정에 실패했습니다.");
        return;
      }

      queryClient.removeQueries({ queryKey: CONCERT_QUERY_KEYS.detail(data.data.id) });
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
    isParamValid,
    initialValues,
    isSubmitting,
    submitError,
    handleSubmit,
    handleCancel,
  };
};
