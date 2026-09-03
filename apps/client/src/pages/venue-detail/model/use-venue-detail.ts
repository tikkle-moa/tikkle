import toast from "react-hot-toast";
import { useNavigate, useParams } from "react-router";

import { useQueryClient } from "@tanstack/react-query";

import { apiClient } from "@shared/api";
import { ROUTE_PATHS } from "@shared/config/router.config";

import { USER_ROLE, useSessionStore } from "@entities/session";
import { VENUE_QUERY_KEYS, useVenueDetail as useVenueDetailQuery } from "@entities/venue";

export const useVenueDetail = () => {
  const { venueId } = useParams();
  const queryClient = useQueryClient();

  const id = Number(venueId);
  const isParamValid = Number.isInteger(id) && id > 0;

  const isAdmin = useSessionStore((state) => state.user?.role === USER_ROLE.ADMIN);
  const { data: { venue, venueSeats = [] } = {}, isPending, isError } = useVenueDetailQuery(id);

  const navigate = useNavigate();

  const handleDelete = async () => {
    try {
      const { data, error, response } = await apiClient.DELETE("/api/venues/{id}", { params: { path: { id } } });

      if (!response.ok || error || !data) {
        throw new Error("Failed to delete venue");
      }

      await queryClient.invalidateQueries({ queryKey: VENUE_QUERY_KEYS.all });
      toast.success("공연장이 삭제되었습니다.");
      navigate(ROUTE_PATHS.VENUE_LIST);
    } catch {
      toast.error("공연장 삭제에 실패했습니다.\n연결된 공연이 있는지 확인해주세요.");
    }
  };

  return {
    isParamValid,
    isAdmin,
    venue,
    venueSeats,
    isPending,
    isError,
    handleDelete,
  };
};
