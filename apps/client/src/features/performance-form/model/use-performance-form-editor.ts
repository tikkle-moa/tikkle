import type { SubmitEvent } from "react";
import { useState } from "react";

import type { PerformanceFormErrors, PerformanceFormValues, PerformanceSubmitState } from "./performance-form.types";
import { getInitialPerformanceFormValues, validatePerformanceForm } from "./performance-form.utils";

interface UsePerformanceFormEditorProps {
  initialValues?: Partial<PerformanceFormValues>;
  submitState: PerformanceSubmitState;
  onSubmit: (values: PerformanceFormValues) => void | Promise<void>;
}

export const usePerformanceFormEditor = ({ initialValues, submitState, onSubmit }: UsePerformanceFormEditorProps) => {
  const [values, setValues] = useState<PerformanceFormValues>(() => getInitialPerformanceFormValues(initialValues));
  const [errors, setErrors] = useState<PerformanceFormErrors>({});
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

    await onSubmit(values);
  };

  return {
    values,
    errors,
    isSubmitting,
    updateField,
    handleSubmit,
  };
};
