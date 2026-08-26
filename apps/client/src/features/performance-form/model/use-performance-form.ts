import { type SubmitEvent, useState } from "react";

import type { PerformanceFormErrors, PerformanceFormValues, PerformanceSubmitState } from "./performance-form.types";
import { getInitialPerformanceFormValues, validatePerformanceForm } from "./performance-form.utils";

interface UsePerformanceFormProps {
  submitState: PerformanceSubmitState;
  initialValues?: Partial<PerformanceFormValues>;
  onSubmit: (values: PerformanceFormValues) => void | Promise<void>;
}

export const usePerformanceForm = ({ submitState, initialValues, onSubmit }: UsePerformanceFormProps) => {
  const [values, setValues] = useState<PerformanceFormValues>(() => getInitialPerformanceFormValues(initialValues));
  const [errors, setErrors] = useState<PerformanceFormErrors>({});

  const updateField = (field: keyof PerformanceFormValues, value: string) => {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  };

  const handleSubmit = async (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();

    const nextErrors = validatePerformanceForm(values);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    await onSubmit(values);
  };

  return {
    values,
    errors,
    isSubmitting: submitState.status === "submitting",
    updateField,
    handleSubmit,
  };
};
