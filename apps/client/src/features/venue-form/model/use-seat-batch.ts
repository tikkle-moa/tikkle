import { type RefObject, useMemo, useState } from "react";
import toast from "react-hot-toast";

import { toRound } from "@shared/lib/number.utils";

import type { CreateVenueRequest } from "@entities/venue";

import { EMPTY_SEAT_BATCH_VALUES } from "./seat-batch.constants";
import type { SeatBatchValues } from "./seat-batch.types";
import { createSeatBatch, validateSeatBatch } from "./seat-batch.utils";
import type { VenueFormSeat } from "./venue-form.types";

interface UseSeatBatchProps {
  venue: CreateVenueRequest;
  venueSeats: VenueFormSeat[];
  venueSeatClientIdRef: RefObject<number>;
  onAddSeats: (seats: VenueFormSeat[]) => void;
}

export const useSeatBatch = ({ venue, venueSeats, venueSeatClientIdRef, onAddSeats }: UseSeatBatchProps) => {
  const [values, setValues] = useState<SeatBatchValues>({ ...EMPTY_SEAT_BATCH_VALUES });
  const [error, setError] = useState<string | null>(null);
  const count = values.rows * values.columns;

  const updateValue = <K extends keyof SeatBatchValues>(field: K, value: SeatBatchValues[K]) => {
    setValues((current) => ({ ...current, [field]: value }));
    setError(null);
  };

  const changeHandlers = useMemo(
    () => ({
      sectionName: (value: string) => updateValue("sectionName", value),
      rows: (value: number) => updateValue("rows", toRound(value)),
      columns: (value: number) => updateValue("columns", toRound(value)),
      startSeatNumber: (value: number) => updateValue("startSeatNumber", toRound(value)),
      price: (value: number) => updateValue("price", toRound(value)),
      startX: (value: number) => updateValue("startX", toRound(value, 2)),
      startY: (value: number) => updateValue("startY", toRound(value, 2)),
      gapX: (value: number) => updateValue("gapX", toRound(value, 2)),
      gapY: (value: number) => updateValue("gapY", toRound(value, 2)),
    }),
    [],
  );

  const handleCreate = () => {
    const nextError = validateSeatBatch(values, venue, venueSeats, venue.width, venue.height);
    setError(nextError);
    if (nextError) return;
    onAddSeats(createSeatBatch(values, venueSeatClientIdRef));
    setValues((current) => ({ ...current, startSeatNumber: current.startSeatNumber + count }));
    toast.success("좌석이 성공적으로 생성되었습니다.");
  };

  return {
    values,
    error,
    count,
    changeHandlers,
    handleCreate,
  };
};
