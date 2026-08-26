import { useState } from "react";
import toast from "react-hot-toast";

import { apiClient } from "@shared/api";

import type { CreatePerformanceRequest, PerformanceResponse, UpdatePerformanceRequest } from "@entities/performance";

import type { PerformanceFormValues, PerformanceSubmitState } from "./performance-form.types";

interface UsePerformanceFormProps {
  concertId: number;
  defaultCreateOpen: boolean;
  onChanged: () => Promise<unknown>;
}

export type PerformanceEditingState = { mode: "create"; key: number } | { mode: "edit"; performance: PerformanceResponse } | null;

export const usePerformanceForm = ({ concertId, defaultCreateOpen, onChanged }: UsePerformanceFormProps) => {
  const [editing, setEditing] = useState<PerformanceEditingState>(() => (defaultCreateOpen ? { mode: "create", key: 0 } : null));
  const [submitState, setSubmitState] = useState<PerformanceSubmitState>({
    status: "idle",
  });
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const refreshPerformances = async () => {
    try {
      await onChanged();
    } catch {
      toast.error("최신 공연 회차 목록을 불러오지 못했습니다.");
    }
  };

  const handleCreate = () => {
    setEditing({ mode: "create", key: 0 });
    setSubmitState({ status: "idle" });
  };

  const handleEdit = (performance: PerformanceResponse) => {
    setEditing({ mode: "edit", performance });
    setSubmitState({ status: "idle" });
  };

  const handleCancel = () => {
    setEditing(null);
    setSubmitState({ status: "idle" });
  };

  const handleSubmit = async (values: PerformanceFormValues) => {
    if (!editing) {
      return;
    }

    setSubmitState({ status: "submitting" });

    try {
      if (editing.mode === "create") {
        const request: CreatePerformanceRequest = {
          concertId,
          startsAt: values.startsAt,
          bookingOpensAt: values.bookingOpensAt || null,
        };

        const { data, error, response } = await apiClient.POST("/api/performances", { body: request });

        if (!response.ok || error || !data) {
          setSubmitState({
            status: "error",
            error: "공연 회차 등록에 실패했습니다.",
          });
          return;
        }

        await refreshPerformances();
        toast.success("공연 회차를 등록했습니다.");

        setEditing({ mode: "create", key: editing.key + 1 });
        setSubmitState({ status: "idle" });
        return;
      }

      const request: UpdatePerformanceRequest = {
        startsAt: values.startsAt,
        bookingOpensAt: values.bookingOpensAt || null,
      };

      const { data, error, response } = await apiClient.PATCH("/api/performances/{id}", {
        params: { path: { id: editing.performance.id } },
        body: request,
      });

      if (!response.ok || error || !data) {
        setSubmitState({
          status: "error",
          error: "공연 회차 수정에 실패했습니다.",
        });
        return;
      }

      await refreshPerformances();
      toast.success("공연 회차를 수정했습니다.");

      setEditing(null);
      setSubmitState({ status: "idle" });
    } catch {
      setSubmitState({
        status: "error",
        error: "공연 회차 저장 중 오류가 발생했습니다.",
      });
    }
  };

  const handleDelete = async (performance: PerformanceResponse) => {
    if (!window.confirm("이 공연 회차를 삭제할까요?")) {
      return;
    }

    setDeletingId(performance.id);

    try {
      const { error, response } = await apiClient.DELETE("/api/performances/{id}", {
        params: { path: { id: performance.id } },
      });

      if (!response.ok || error) {
        toast.error("공연 회차 삭제에 실패했습니다.");
        return;
      }

      await refreshPerformances();
      toast.success("공연 회차를 삭제했습니다.");
    } catch {
      toast.error("공연 회차 삭제 중 오류가 발생했습니다.");
    } finally {
      setDeletingId(null);
    }
  };

  return {
    editing,
    submitState,
    deletingId,
    handleCreate,
    handleEdit,
    handleCancel,
    handleSubmit,
    handleDelete,
  };
};
