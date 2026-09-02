import { type SubmitEvent, useEffect, useState } from "react";

import type { SubmitState } from "@shared/model/form.types";

import type { CreateVenueDetailRequest, CreateVenueRequest, CreateVenueSeatRequest } from "@entities/venue";

import { EMPTY_VENUE_FORM_VALUES } from "./venue-form.constants";
import type { VenueFormErrors } from "./venue-form.types";
import { getErrorSections, replaceVenueSeatCollisionErrors, toCreateVenueRequest, validateVenueForm } from "./venue-form.utils";

interface UseVenueFormProps {
  initialValues?: CreateVenueDetailRequest;
  submitState: SubmitState;
  onSubmit: (values: CreateVenueDetailRequest) => void | Promise<void>;
}

export const useVenueForm = ({ initialValues, submitState, onSubmit }: UseVenueFormProps) => {
  const [venue, setVenue] = useState<CreateVenueRequest>(EMPTY_VENUE_FORM_VALUES);
  const [venueSeats, setVenueSeats] = useState<CreateVenueSeatRequest[]>([]);
  const [errors, setErrors] = useState<VenueFormErrors>({});
  const isSubmitting = submitState.status === "submitting";

  useEffect(() => {
    if (!initialValues) return;

    const initializeForm = () => {
      setVenue({ ...initialValues.venue });
      setVenueSeats(initialValues.venueSeats.map((seat) => ({ ...seat })));
      setErrors({});
    };

    initializeForm();
  }, [initialValues]);

  useEffect(() => {
    const updateCollisionErrors = () => {
      setErrors((current) => {
        const next = replaceVenueSeatCollisionErrors(current, venueSeats);
        const nextEntries = Object.entries(next);
        const isSame = nextEntries.length === Object.keys(current).length && nextEntries.every(([key, message]) => current[key] === message);
        return isSame ? current : next;
      });
    };

    updateCollisionErrors();
  }, [venueSeats]);

  const updateVenue = <K extends keyof CreateVenueRequest>(field: K, value: CreateVenueRequest[K]) => {
    setVenue((current) => ({ ...current, [field]: value }));
    setErrors(({ [field]: _, ...next }) => next);
  };

  const handleSubmit = async (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();

    const nextErrors = validateVenueForm(venue, venueSeats);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    await onSubmit(toCreateVenueRequest(venue, venueSeats));
  };

  const errorKeys = Object.entries(errors).flatMap(([key, message]) => (message ? [key] : []));
  const errorCount = errorKeys.length;
  const errorSections = getErrorSections(errorKeys);

  return {
    venue,
    venueSeats,
    errors,
    errorCount,
    errorSections,
    isSubmitting,
    updateVenue,
    setVenue,
    setVenueSeats,
    setErrors,
    handleSubmit,
  };
};
