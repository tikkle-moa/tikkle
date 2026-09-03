import { type SubmitEvent, useEffect, useRef, useState } from "react";

import type { SubmitState } from "@shared/model/form.types";

import type { CreateVenueRequest, VenueDetailResponse } from "@entities/venue";

import { EMPTY_VENUE_FORM_VALUES } from "./venue-form.constants";
import type { VenueFormErrors, VenueFormSeat } from "./venue-form.types";
import { getErrorSections, toCreateVenueRequest, toCreateVenueSeatRequest, validateVenueForm } from "./venue-form.utils";

interface UseVenueFormProps {
  initialValues?: VenueDetailResponse;
  submitState: SubmitState;
  onSubmit: (venue: CreateVenueRequest, venueSeats: VenueFormSeat[]) => void | Promise<void>;
}

export const useVenueForm = ({ initialValues, submitState, onSubmit }: UseVenueFormProps) => {
  const [venue, setVenue] = useState<CreateVenueRequest>(EMPTY_VENUE_FORM_VALUES);
  const [venueSeats, setVenueSeats] = useState<VenueFormSeat[]>([]);
  const [errors, setErrors] = useState<VenueFormErrors>({});
  const venueSeatClientIdRef = useRef(1);
  const isSubmitting = submitState.status === "submitting";

  useEffect(() => {
    if (!initialValues) return;

    const initializeForm = () => {
      const { id: _venueId, createdAt: _venueCreatedAt, ...venueValues } = initialValues.venue;
      setVenue(venueValues);
      setVenueSeats(initialValues.venueSeats.map(({ id, venueId: _venueId, createdAt: _createdAt, ...seat }) => ({ clientId: id, ...seat })));
      const maxClientId = Math.max(0, ...initialValues.venueSeats.map((seat) => seat.id));
      venueSeatClientIdRef.current = maxClientId + 1;
      setErrors({});
    };

    initializeForm();
  }, [initialValues]);

  const updateVenue = <K extends keyof CreateVenueRequest>(field: K, value: CreateVenueRequest[K]) => {
    setVenue((current) => ({ ...current, [field]: value }));
    setErrors(({ [field]: _, ...next }) => next);
  };

  const handleSubmit = async (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();

    const nextErrors = validateVenueForm(venue, venueSeats);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    await onSubmit(toCreateVenueRequest(venue), toCreateVenueSeatRequest(venueSeats));
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
    venueSeatClientIdRef,
    isSubmitting,
    updateVenue,
    setVenue,
    setVenueSeats,
    setErrors,
    handleSubmit,
  };
};
