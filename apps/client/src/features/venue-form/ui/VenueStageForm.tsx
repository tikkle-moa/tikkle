import { memo } from "react";

import { toRound } from "@shared/lib/number.utils";

import { type CreateVenueRequest, VENUE_SEAT_HEIGHT, VENUE_SEAT_WIDTH } from "@entities/venue";

import VenueFormNumberInput from "./VenueFormNumberInput";

import type { VenueFormErrors } from "../model/venue-form.types";

interface VenueStageFormProps {
  venue: CreateVenueRequest;
  errors: VenueFormErrors;
  isSubmitting: boolean;
  updateVenue: <K extends keyof CreateVenueRequest>(field: K, value: CreateVenueRequest[K]) => void;
}

const VenueStageForm = ({ venue, errors, isSubmitting, updateVenue }: VenueStageFormProps) => {
  return (
    <section className="space-y-6 border-b border-slate-200 bg-slate-50/60 p-4 sm:p-6">
      <div>
        <h3 className="text-sm font-bold text-slate-900">공연장 및 무대 크기</h3>
        <p className="mt-1 text-xs text-slate-500">모든 크기와 좌표는 동일한 단위로 입력해 주세요. 좌측 상단이 (0, 0)입니다.</p>
      </div>
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <VenueFormNumberInput
          id="venue-width"
          label="공연장 가로"
          min={Math.max(VENUE_SEAT_WIDTH, venue.stageWidth)}
          value={venue.width}
          error={errors.width}
          required
          disabled={isSubmitting}
          onChange={(value) => updateVenue("width", toRound(value, 2))}
        />
        <VenueFormNumberInput
          id="venue-height"
          label="공연장 세로"
          min={Math.max(VENUE_SEAT_HEIGHT, venue.stageHeight)}
          value={venue.height}
          error={errors.height}
          required
          disabled={isSubmitting}
          onChange={(value) => updateVenue("height", toRound(value, 2))}
        />
        <VenueFormNumberInput
          id="venue-stage-x"
          label="무대 X 좌표"
          value={venue.stagePositionX}
          min={venue.stageWidth / 2}
          max={venue.width - venue.stageWidth / 2}
          error={errors.stagePositionX}
          required
          disabled={isSubmitting}
          onChange={(value) => updateVenue("stagePositionX", toRound(value, 2))}
        />
        <VenueFormNumberInput
          id="venue-stage-y"
          label="무대 Y 좌표"
          value={venue.stagePositionY}
          min={venue.stageHeight / 2}
          max={venue.height - venue.stageHeight / 2}
          error={errors.stagePositionY}
          required
          disabled={isSubmitting}
          onChange={(value) => updateVenue("stagePositionY", toRound(value, 2))}
        />
        <VenueFormNumberInput
          id="venue-stage-width"
          label="무대 가로"
          value={venue.stageWidth}
          max={Math.max(0, Math.min(999.99, venue.stagePositionX * 2, (venue.width - venue.stagePositionX) * 2))}
          error={errors.stageWidth}
          required
          disabled={isSubmitting}
          onChange={(value) => updateVenue("stageWidth", toRound(value, 2))}
        />
        <VenueFormNumberInput
          id="venue-stage-height"
          label="무대 세로"
          value={venue.stageHeight}
          max={Math.max(0, Math.min(999.99, venue.stagePositionY * 2, (venue.height - venue.stagePositionY) * 2))}
          error={errors.stageHeight}
          required
          disabled={isSubmitting}
          onChange={(value) => updateVenue("stageHeight", toRound(value, 2))}
        />
      </div>
    </section>
  );
};

export default memo(VenueStageForm);
