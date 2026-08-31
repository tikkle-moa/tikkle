import { type SubmitEvent, useEffect, useState } from "react";

import type { CreateConcertRequest } from "@entities/concert";
import { useVenues } from "@entities/venue";

import { EMPTY_CONCERT_FORM_VALUES } from "./concert-form.constants";
import type { ConcertFormErrors, ConcertFormMode, SubmitState } from "./concert-form.types";
import { getInitialConcertFormValues, toConcertRequest, validateConcertForm } from "./concert-form.utils";

interface UseConcertFormProps {
  mode: ConcertFormMode;
  submitState: SubmitState;
  initialValues?: Partial<CreateConcertRequest>;
  onSubmit: (values: CreateConcertRequest) => void | Promise<void>;
}

export const useConcertForm = ({ mode, submitState, initialValues, onSubmit }: UseConcertFormProps) => {
  const isCreateMode = mode === "create";
  const [values, setValues] = useState<CreateConcertRequest>(EMPTY_CONCERT_FORM_VALUES);
  const [errors, setErrors] = useState<ConcertFormErrors>({});
  const [posterLoadFailed, setPosterLoadFailed] = useState(false);
  const isSubmitting = submitState.status === "submitting";

  const { data: venues, isLoading: isVenueLoading, isError: isVenueError } = useVenues(isCreateMode);

  useEffect(() => {
    if (!initialValues) return;

    const initializeForm = () => {
      setValues(getInitialConcertFormValues(initialValues));
      setErrors({});
      setPosterLoadFailed(false);
    };

    initializeForm();
  }, [initialValues]);

  const updateField = <K extends keyof CreateConcertRequest>(field: K, value: CreateConcertRequest[K]) => {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));

    if (field === "posterUrl") {
      setPosterLoadFailed(false);
    }
  };

  const handleSubmit = async (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();

    const nextErrors = validateConcertForm(values, posterLoadFailed);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    await onSubmit(toConcertRequest(values));
  };

  const handlePosterError = () => {
    setPosterLoadFailed(true);
  };

  return {
    isCreateMode,
    venues,
    isVenueLoading,
    isVenueError,
    isSubmitting,
    values,
    errors,
    updateField,
    handleSubmit,
    handlePosterError,
  };
};
