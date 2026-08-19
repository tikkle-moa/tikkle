import type { SubmitEvent } from "react";
import { useState } from "react";

import type { CreateConcertRequest } from "@entities/concert";

import type { ConcertFormErrors } from "./concert-form.types";
import { getInitialConcertFormValues, toConcertRequest, validateConcertForm } from "./concert-form.utils";

interface UseConcertFormProps {
  initialValues?: Partial<CreateConcertRequest>;
  onSubmit: (values: CreateConcertRequest) => void | Promise<void>;
}

export const useConcertForm = ({ initialValues, onSubmit }: UseConcertFormProps) => {
  const [values, setValues] = useState<CreateConcertRequest>(() => getInitialConcertFormValues(initialValues));
  const [errors, setErrors] = useState<ConcertFormErrors>({});
  const [posterLoadFailed, setPosterLoadFailed] = useState(false);

  const updateField = (field: keyof CreateConcertRequest, value: string) => {
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
    values,
    errors,
    updateField,
    handleSubmit,
    handlePosterError,
  };
};
