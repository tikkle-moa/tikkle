import { memo } from "react";

import type { CreateVenueRequest } from "@entities/venue";

import VenueFormTextInput from "./VenueFormTextInput";
import VenueFormTextarea from "./VenueFormTextarea";

import { VENUE_FORM_LIMITS } from "../model/venue-form.constants";
import type { VenueFormErrors } from "../model/venue-form.types";

interface VenueInfoFormProps {
  venue: CreateVenueRequest;
  errors: VenueFormErrors;
  isSubmitting: boolean;
  updateVenue: <K extends keyof CreateVenueRequest>(field: K, value: CreateVenueRequest[K]) => void;
}

const VenueInfoForm = ({ venue, errors, isSubmitting, updateVenue }: VenueInfoFormProps) => {
  return (
    <section className="space-y-6 border-b border-slate-200 p-4 sm:p-6">
      <h3 className="text-sm font-bold text-slate-900">기본 정보</h3>
      <div className="grid gap-5 sm:grid-cols-2">
        <VenueFormTextInput
          id="venue-name"
          label="공연장 이름"
          value={venue.name}
          maxLength={VENUE_FORM_LIMITS.venueName}
          error={errors.name}
          placeholder="예: 티끌 아트홀"
          required
          disabled={isSubmitting}
          onChange={(value) => updateVenue("name", value)}
        />
        <VenueFormTextInput
          id="venue-address"
          label="주소"
          value={venue.address}
          maxLength={VENUE_FORM_LIMITS.venueAddress}
          error={errors.address}
          placeholder="예: 서울특별시 송파구 올림픽로 000"
          required
          disabled={isSubmitting}
          onChange={(value) => updateVenue("address", value)}
        />
      </div>

      <VenueFormTextarea
        id="venue-description"
        label="공연장 설명"
        value={venue.description}
        maxLength={VENUE_FORM_LIMITS.venueDescription}
        error={errors.description}
        placeholder="공연장의 특징이나 이용 안내를 입력하세요."
        disabled={isSubmitting}
        onChange={(value) => updateVenue("description", value === "" ? null : value)}
      />
    </section>
  );
};

export default memo(VenueInfoForm);
