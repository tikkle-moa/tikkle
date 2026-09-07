import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { generatePath, useNavigate, useParams } from "react-router";

import { useQueryClient } from "@tanstack/react-query";

import { apiClient } from "@shared/api";
import { ROUTE_PATHS } from "@shared/config/router.config";
import type { SubmitState } from "@shared/model/form.types";

import { type CreateVenueRequest, VENUE_QUERY_KEYS } from "@entities/venue";

import type { VenueFormSeat } from "@features/venue-form";

import type { LoadState } from "./venue-edit.types";
import { toUpdateVenueRequest } from "./venue-edit.utils";

export const useVenueEdit = () => {
  const { venueId } = useParams();
  const queryClient = useQueryClient();

  const id = Number(venueId);
  const isParamValid = Number.isInteger(id) && id > 0;

  const [loadState, setLoadState] = useState<LoadState>({ status: "loading" });
  const [submitState, setSubmitState] = useState<SubmitState>({ status: "idle" });

  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;
    const fetchVenue = async () => {
      if (!isParamValid) {
        setLoadState({ status: "error", error: "잘못된 공연장 ID입니다." });
        return;
      }

      setLoadState({ status: "loading" });
      try {
        const { data, error, response } = await apiClient.GET(`/api/venues/{id}`, { params: { path: { id } } });
        if (cancelled) return;
        if (!response.ok || error || !data) {
          setLoadState({ status: "error", error: "공연장 정보를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요." });
          return;
        }

        setLoadState({ status: "success", data: data.data });
      } catch {
        if (cancelled) return;
        setLoadState({ status: "error", error: "공연장 정보를 불러오는 중 오류가 발생했습니다." });
      }
    };

    fetchVenue();
    return () => {
      cancelled = true;
    };
  }, [id, isParamValid]);

  const handleSubmit = async (venue: CreateVenueRequest, venueSeats: VenueFormSeat[]) => {
    if (loadState.status !== "success") {
      setSubmitState({ status: "error", error: "공연장 정보를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요." });
      return;
    }
    const updateVenueRequest = toUpdateVenueRequest(venue, venueSeats, loadState.data);

    if (Object.keys(updateVenueRequest).length === 0) {
      setSubmitState({ status: "error", error: "변경된 내용이 없습니다." });
      return;
    }

    setSubmitState({ status: "submitting" });
    try {
      const { data, error, response } = await apiClient.PATCH("/api/venues/{id}", { params: { path: { id } }, body: updateVenueRequest });

      if (!response.ok || error || !data) {
        setSubmitState({ status: "error", error: "공연장 수정에 실패했습니다. 입력 정보를 확인해 주세요." });
        return;
      }

      await queryClient.invalidateQueries({ queryKey: VENUE_QUERY_KEYS.all });
      toast.success(`"${venue.name}" 공연장 수정이 완료되었습니다.`);
      navigate(
        generatePath(ROUTE_PATHS.VENUE_DETAIL, {
          venueId: String(data.data.venue.id),
        }),
        { replace: true },
      );
    } catch {
      setSubmitState({ status: "error", error: "공연장 수정 중 오류가 발생했습니다." });
    }
  };

  const handleCancel = () => {
    navigate(ROUTE_PATHS.VENUE_LIST);
  };

  return {
    loadState,
    submitState,
    handleSubmit,
    handleCancel,
  };
};
