import { useState } from "react";
import toast from "react-hot-toast";
import { generatePath, useNavigate } from "react-router";

import { useQueryClient } from "@tanstack/react-query";

import { apiClient } from "@shared/api";
import { ROUTE_PATHS } from "@shared/config/router.config";
import type { SubmitState } from "@shared/model/form.types";

import { type CreateVenueRequest, VENUE_QUERY_KEYS } from "@entities/venue";

import type { VenueFormSeat } from "@features/venue-form";

export const useVenueNew = () => {
  const [submitState, setSubmitState] = useState<SubmitState>({ status: "idle" });
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const handleSubmit = async (venue: CreateVenueRequest, venueSeats: VenueFormSeat[]) => {
    setSubmitState({ status: "submitting" });
    try {
      const { data, error, response } = await apiClient.POST("/api/venues", {
        body: { venue, venueSeats: venueSeats.map(({ clientId: _, ...rest }) => rest) },
      });
      if (!response.ok || error || !data) {
        setSubmitState({ status: "error", error: "공연장 등록에 실패했습니다. 입력 정보를 확인해 주세요." });
        return;
      }
      await queryClient.invalidateQueries({ queryKey: VENUE_QUERY_KEYS.all });
      toast.success(`"${venue.name}" 공연장이 등록되었습니다.`);
      navigate(
        generatePath(ROUTE_PATHS.VENUE_DETAIL, {
          venueId: String(data.data.venue.id),
        }),
        { replace: true },
      );
    } catch {
      setSubmitState({ status: "error", error: "공연장 등록 중 오류가 발생했습니다." });
    }
  };

  const handleCancel = () => {
    navigate(ROUTE_PATHS.VENUE_LIST);
  };

  return {
    submitState,
    handleSubmit,
    handleCancel,
  };
};
