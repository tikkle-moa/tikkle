import { type SubmitEvent, useEffect, useRef, useState } from "react";

import type { SubmitState } from "@shared/model/form.types";

import type { CreateVenueDetailRequest, CreateVenueRequest, CreateVenueSeatRequest } from "@entities/venue";

import { EMPTY_VENUE_FORM_VALUES } from "./venue-form.constants";
import type { VenueFormErrors } from "./venue-form.types";
import { getErrorSections, toCreateVenueRequest, validateVenueForm } from "./venue-form.utils";

interface UseVenueFormProps {
  initialValues?: CreateVenueDetailRequest;
  submitState: SubmitState;
  onSubmit: (values: CreateVenueDetailRequest) => void | Promise<void>;
}

export const useVenueForm = ({ initialValues, submitState, onSubmit }: UseVenueFormProps) => {
  const [venue, setVenue] = useState<CreateVenueRequest>(EMPTY_VENUE_FORM_VALUES);
  const [venueSeats, setVenueSeats] = useState<CreateVenueSeatRequest[]>([]);

  const [errors, setErrors] = useState<VenueFormErrors>({});
  const previousVenueSeatsRef = useRef(venueSeats);

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
    if (previousVenueSeatsRef.current === venueSeats) return;

    previousVenueSeatsRef.current = venueSeats;
    setErrors(validateVenueForm(venue, venueSeats));
  }, [venue, venueSeats]);

  const updateVenue = <K extends keyof CreateVenueRequest>(field: K, value: CreateVenueRequest[K]) => {
    setVenue((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: "" }));
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
    handleSubmit,
  };
};
