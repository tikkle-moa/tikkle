import { useState } from "react";
import toast from "react-hot-toast";

import { deletePerformance } from "@features/performance-form";

export const usePerformanceBookingPanel = (onChanged: () => Promise<unknown>) => {
  const [editingPerformanceIds, setEditingPerformanceIds] = useState<Set<number>>(new Set());
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [deletingPerformanceIds, setDeletingPerformanceIds] = useState<Set<number>>(new Set());

  const handleEditOpen = (performanceId: number) => {
    setEditingPerformanceIds((current) => new Set(current).add(performanceId));
  };

  const handleEditClose = (performanceId: number) => {
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
      await onChanged();

      toast.success("공연 회차를 삭제했습니다.");
      handleEditClose(performanceId);
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

  return {
    editingPerformanceIds,
    isCreateOpen,
    deletingPerformanceIds,
    handleEditOpen,
    handleEditClose,
    handleCreateOpen,
    handleCreateClose,
    handleDelete,
  };
};
