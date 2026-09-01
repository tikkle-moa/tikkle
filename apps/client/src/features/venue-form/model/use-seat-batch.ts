import { useState } from "react";

import type { CreateVenueRequest, CreateVenueSeatRequest } from "@entities/venue";

import { EMPTY_SEAT_BATCH_VALUES } from "./seat-batch.constants";
import type { SeatBatchValues } from "./seat-batch.types";
import { createSeatBatch, validateSeatBatch } from "./seat-batch.utils";

interface UseSeatBatchProps {
  venue: CreateVenueRequest;
  onAddSeats: (seats: CreateVenueSeatRequest[]) => void;
}

export const useSeatBatch = ({ venue, onAddSeats }: UseSeatBatchProps) => {
  const [values, setValues] = useState<SeatBatchValues>({ ...EMPTY_SEAT_BATCH_VALUES });
  const [error, setError] = useState<string | null>(null);
  const count = values.rows * values.columns;

  const updateValue = <K extends keyof SeatBatchValues>(field: K, value: SeatBatchValues[K]) => {
    setValues((current) => ({ ...current, [field]: value }));
    setError(null);
  };

  const handleCreate = () => {
    const nextError = validateSeatBatch(values, venue.width, venue.height);
    setError(nextError);
    if (nextError) return;
    onAddSeats(createSeatBatch(values));
    setValues((current) => ({ ...current, startSeatNumber: current.startSeatNumber + count }));
  };

  return { values, error, count, updateValue, handleCreate };
};
