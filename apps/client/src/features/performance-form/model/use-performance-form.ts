import type { SubmitEvent } from "react";
import { useState } from "react";
import toast from "react-hot-toast";

import type { CreatePerformanceRequest, UpdatePerformanceRequest } from "@entities/performance";

import { createPerformance, updatePerformance } from "./performance-form.api";
import type { PerformanceFormErrors, PerformanceFormValues, PerformanceSubmitState } from "./performance-form.types";
import { getInitialPerformanceFormValues, validatePerformanceForm } from "./performance-form.utils";

interface UsePerformanceFormProps {
  concertId: number;
  performanceId?: number;
  initialValues?: Partial<PerformanceFormValues>;
  onSaved: () => Promise<unknown>;
  onSuccess: () => void;
}

export const usePerformanceForm = ({ concertId, performanceId, initialValues, onSaved, onSuccess }: UsePerformanceFormProps) => {
  const [values, setValues] = useState<PerformanceFormValues>(() => getInitialPerformanceFormValues(initialValues));
  const [errors, setErrors] = useState<PerformanceFormErrors>({});
  const [submitState, setSubmitState] = useState<PerformanceSubmitState>({
    status: "idle",
  });

  const isSubmitting = submitState.status === "submitting";

  const updateField = (field: keyof PerformanceFormValues, value: string) => {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  };

  const handleSubmit = async (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();

    const nextErrors = validatePerformanceForm(values);
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    setSubmitState({ status: "submitting" });

    try {
      if (performanceId === undefined) {
        const request: CreatePerformanceRequest = {
          concertId,
          startsAt: values.startsAt,
          bookingOpensAt: values.bookingOpensAt || null,
        };

        await createPerformance(request);
        await onSaved();
        toast.success("공연 회차를 등록했습니다.");
        onSuccess();
      } else {
        const request: UpdatePerformanceRequest = {
          startsAt: values.startsAt,
          bookingOpensAt: values.bookingOpensAt || null,
        };

        await updatePerformance(performanceId, request);
        await onSaved();
        toast.success("공연 회차를 수정했습니다.");
        onSuccess();
      }
    } catch {
      setSubmitState({
        status: "error",
        error: "공연 회차 저장 중 오류가 발생했습니다.",
      });
    }
  };

  return {
    values,
    errors,
    submitState,
    isSubmitting,
    updateField,
    handleSubmit,
  };
};
