import type { RefObject } from "react";

import { Grid3X3, WandSparkles } from "lucide-react";

import { toRound } from "@shared/lib/number.utils";

import { type CreateVenueRequest, VENUE_SEAT_HEIGHT, VENUE_SEAT_WIDTH } from "@entities/venue";

import VenueFormNumberInput from "./VenueFormNumberInput";
import VenueFormTextInput from "./VenueFormTextInput";

import { useSeatBatch } from "../model/use-seat-batch";
import type { VenueFormSeat } from "../model/venue-form.types";

interface SeatBatchCreatorProps {
  venue: CreateVenueRequest;
  venueSeats: VenueFormSeat[];
  venueSeatClientIdRef: RefObject<number>;
  isSubmitting: boolean;
  onAddSeats: (seats: VenueFormSeat[]) => void;
}

const SeatBatchCreator = ({ venue, venueSeats, venueSeatClientIdRef, isSubmitting, onAddSeats }: SeatBatchCreatorProps) => {
  const { values, error, count, updateValue, handleCreate } = useSeatBatch({ venue, venueSeats, venueSeatClientIdRef, onAddSeats });

  return (
    <div className="rounded-2xl border border-violet-100 bg-violet-50/60 p-4 sm:p-5">
      <div className="mb-5 flex items-start gap-3">
        <span className="bg-brand-primary flex size-9 items-center justify-center rounded-xl text-white">
          <Grid3X3 className="size-4" aria-hidden />
        </span>
        <div>
          <h4 className="text-sm font-bold text-slate-900">좌석 일괄 생성</h4>
          <p className="mt-1 text-xs leading-5 text-slate-500">시작점에서 오른쪽, 아래 방향으로 행과 열을 생성합니다.</p>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <VenueFormTextInput
          id="batch-section"
          label="구역명"
          value={values.sectionName}
          required
          disabled={isSubmitting}
          onChange={(value) => updateValue("sectionName", value)}
        />
        <VenueFormNumberInput
          id="batch-rows"
          label="행"
          value={values.rows}
          min={1}
          required
          disabled={isSubmitting}
          onChange={(value) => updateValue("rows", toRound(value))}
        />
        <VenueFormNumberInput
          id="batch-columns"
          label="열"
          value={values.columns}
          min={1}
          required
          disabled={isSubmitting}
          onChange={(value) => updateValue("columns", toRound(value))}
        />
        <VenueFormNumberInput
          id="batch-start-number"
          label="시작 좌석 번호"
          value={values.startSeatNumber}
          min={1}
          max={null}
          required
          disabled={isSubmitting}
          onChange={(value) => updateValue("startSeatNumber", toRound(value))}
        />
        <VenueFormNumberInput
          id="batch-price"
          label="가격 (원)"
          value={values.price}
          max={null}
          required
          disabled={isSubmitting}
          onChange={(value) => updateValue("price", toRound(value))}
        />
        <VenueFormNumberInput
          id="batch-start-x"
          label="시작 X"
          value={values.startX}
          max={venue.width}
          required
          disabled={isSubmitting}
          onChange={(value) => updateValue("startX", toRound(value, 2))}
        />
        <VenueFormNumberInput
          id="batch-start-y"
          label="시작 Y"
          value={values.startY}
          max={venue.height}
          required
          disabled={isSubmitting}
          onChange={(value) => updateValue("startY", toRound(value, 2))}
        />
        <VenueFormNumberInput
          id="batch-gap-x"
          label="가로 간격"
          value={values.gapX}
          min={VENUE_SEAT_WIDTH}
          required
          disabled={isSubmitting}
          onChange={(value) => updateValue("gapX", toRound(value, 2))}
        />
        <VenueFormNumberInput
          id="batch-gap-y"
          label="세로 간격"
          value={values.gapY}
          min={VENUE_SEAT_HEIGHT}
          required
          disabled={isSubmitting}
          onChange={(value) => updateValue("gapY", toRound(value, 2))}
        />
      </div>
      {error && (
        <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-700" role="alert">
          {error}
        </p>
      )}
      <button
        className="bg-brand-primary mt-5 flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-white hover:brightness-95 disabled:opacity-50"
        disabled={isSubmitting || !Number.isFinite(count) || count < 1}
        onClick={handleCreate}
        type="button"
      >
        <WandSparkles className="size-4" aria-hidden /> {Number.isFinite(count) ? count.toLocaleString() : 0}개 좌석 생성
      </button>
    </div>
  );
};

export default SeatBatchCreator;
