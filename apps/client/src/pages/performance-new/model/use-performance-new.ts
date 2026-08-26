import { useState } from "react";
import toast from "react-hot-toast";
import { generatePath, useNavigate, useParams } from "react-router";

import { ROUTE_PATHS } from "@shared/config/router.config";

import { useConcertDetail } from "@entities/concert";

import { deletePerformance } from "@features/performance-form";

export const usePerformanceNew = () => {
  const { concertId } = useParams();
  const navigate = useNavigate();

  const id = Number(concertId);
  const isParamValid = Number.isInteger(id) && id > 0;
  const { data, isError, isPending, refetch } = useConcertDetail(id);

  const [editingPerformanceIds, setEditingPerformanceIds] = useState<Set<number>>(new Set());
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [deletingPerformanceIds, setDeletingPerformanceIds] = useState<Set<number>>(new Set());

  const handleEditOpen = (performanceId: number) => {
    setEditingPerformanceIds((current) => new Set(current).add(performanceId));
  };

  const handleEditCancel = (performanceId: number) => {
    setEditingPerformanceIds((current) => {
      const next = new Set(current);
      next.delete(performanceId);
      return next;
    });
  };

  const handleCreateOpen = () => {
    setIsCreateOpen(true);
  };

  const handleCreateClose = () => {
    setIsCreateOpen(false);
  };

  const handleDelete = async (performanceId: number) => {
    if (!window.confirm("이 공연 회차를 삭제할까요?")) {
      return;
    }

    setDeletingPerformanceIds((current) => new Set(current).add(performanceId));

    try {
      await deletePerformance(performanceId);
      await refetch();

      toast.success("공연 회차를 삭제했습니다.");
      handleEditCancel(performanceId);
    } catch {
      toast.error("공연 회차 삭제 중 오류가 발생했습니다.");
    } finally {
      setDeletingPerformanceIds((current) => {
        const next = new Set(current);
        next.delete(performanceId);
        return next;
      });
    }
  };

  const handleComplete = () => {
    if (!isParamValid) {
      navigate(ROUTE_PATHS.CONCERT_LIST);
      return;
    }

    navigate(
      generatePath(ROUTE_PATHS.CONCERT_DETAIL, {
        concertId: String(id),
      }),
      { replace: true },
    );
  };

  return {
    concertId: id,
    concert: data?.concert,
    performances: data?.performances ?? [],
    isParamValid,
    isPending,
    isError,
    refetch,
    editingPerformanceIds,
    isCreateOpen,
    deletingPerformanceIds,
    handleEditOpen,
    handleEditCancel,
    handleCreateOpen,
    handleCreateClose,
    handleDelete,
    handleComplete,
  };
};
