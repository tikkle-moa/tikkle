import toast from "react-hot-toast";
import { useNavigate, useParams } from "react-router";

import { useQueryClient } from "@tanstack/react-query";

import { apiClient } from "@shared/api";
import { ROUTE_PATHS } from "@shared/config/router.config";

import { useConcertDetail as useConcertDetailQuery } from "@entities/concert";
import { CONCERT_QUERY_KEYS } from "@entities/concert";
import { USER_ROLE, useSessionStore } from "@entities/session";
import { VENUE_QUERY_KEYS } from "@entities/venue";

export const useConcertDetail = () => {
  const { concertId } = useParams();
  const queryClient = useQueryClient();

  const id = Number(concertId);
  const isParamValid = Number.isInteger(id) && id > 0;

  const isAdmin = useSessionStore((state) => state.user?.role === USER_ROLE.ADMIN);
  const { data, isPending, isError, refetch } = useConcertDetailQuery(id);

  const navigate = useNavigate();

  const handleDelete = async () => {
    if (!window.confirm(`"${data?.concert?.title ?? "콘서트"}" 콘서트를 삭제할까요?`)) return;

    try {
      const { data, error, response } = await apiClient.DELETE("/api/concerts/{id}", { params: { path: { id } } });

      if (!response.ok || error || !data) {
        throw new Error("Failed to delete concert");
      }

      queryClient.removeQueries({ queryKey: CONCERT_QUERY_KEYS.all });
      queryClient.removeQueries({ queryKey: VENUE_QUERY_KEYS.all });
      toast.success("콘서트가 삭제되었습니다.");
      navigate(ROUTE_PATHS.CONCERT_LIST);
    } catch {
      toast.error("콘서트 삭제에 실패했습니다.\n잠시 후 다시 시도해주세요.");
    }
  };

  return {
    isParamValid,
    isAdmin,
    concert: data?.concert,
    performances: data?.performances ?? [],
    isPending,
    isError,
    refetch,
    handleDelete,
  };
};
