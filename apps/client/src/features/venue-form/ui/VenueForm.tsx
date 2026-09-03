import { AlertCircle, Building2, CircleAlert, LoaderCircle } from "lucide-react";

import { toRound } from "@shared/lib/number.utils";
import type { SubmitState } from "@shared/model/form.types";

import type { CreateVenueDetailRequest } from "@entities/venue";

import VenueFormNumberInput from "./VenueFormNumberInput";
import VenueFormTextInput from "./VenueFormTextInput";
import VenueFormTextarea from "./VenueFormTextarea";
import VenueSeatForm from "./VenueSeatForm";

import { useVenueForm } from "../model/use-venue-form";
import { VENUE_FORM_LIMITS } from "../model/venue-form.constants";
import type { VenueFormMode } from "../model/venue-form.types";

interface VenueFormProps {
  mode: VenueFormMode;
  initialValues?: CreateVenueDetailRequest;
  submitState: SubmitState;
  onSubmit: (values: CreateVenueDetailRequest) => void | Promise<void>;
  onCancel?: () => void;
}

const VenueForm = ({ mode, initialValues, submitState, onSubmit, onCancel }: VenueFormProps) => {
  const {
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
  } = useVenueForm({ initialValues, submitState, onSubmit });

  return (
    <form className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm" noValidate onSubmit={handleSubmit}>
      <div className="flex flex-col gap-4 border-b border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div className="flex items-start gap-3">
          <div className="bg-brand-primary/10 text-brand-primary flex size-10 shrink-0 items-center justify-center rounded-xl">
            <Building2 className="size-5" aria-hidden />
          </div>
          <div>
            <h2 className="font-bold text-slate-900">
              공연장 정보 (<span className="text-red-500">*</span> 필수 입력 항목)
            </h2>
            <p className="mt-1 text-sm text-slate-500">공연장과 무대, 좌석 배치를 입력해 주세요.</p>
          </div>
        </div>
        <div className="flex gap-2">
          {onCancel && (
            <button
              className="rounded-lg border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              disabled={isSubmitting}
              onClick={onCancel}
              type="button"
            >
              취소
            </button>
          )}
          <button
            className="bg-brand-primary flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold text-white hover:brightness-95 disabled:opacity-50"
            disabled={isSubmitting}
            type="submit"
          >
            {isSubmitting && <LoaderCircle className="size-4 animate-spin" aria-hidden />}
            {isSubmitting ? "등록 중..." : mode === "create" ? "공연장 등록" : "공연장 수정"}
          </button>
        </div>
      </div>

      {submitState.status === "error" && (
        <p
          className="m-4 flex items-center gap-2 rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-red-700 sm:mx-6"
          role="alert"
        >
          <AlertCircle className="size-4 shrink-0" aria-hidden /> {submitState.error}
        </p>
      )}

      {errorCount > 0 && (
        <div className="m-4 flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-700 sm:mx-6" role="alert">
          <CircleAlert aria-hidden className="mt-0.5 size-5 shrink-0" />

          <div>
            <p className="text-sm font-semibold">입력 내용을 다시 확인해 주세요.</p>

            <p className="mt-1 text-xs leading-5 text-red-600">
              {errorSections.join(", ")}에서 {errorCount}개의 오류가 발견되었습니다.
            </p>
          </div>
        </div>
      )}

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

      <section className="space-y-6 border-b border-slate-200 bg-slate-50/60 p-4 sm:p-6">
        <div>
          <h3 className="text-sm font-bold text-slate-900">공연장 및 무대 크기</h3>
          <p className="mt-1 text-xs text-slate-500">모든 크기와 좌표는 동일한 단위로 입력해 주세요. 좌측 상단이 (0, 0)입니다.</p>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <VenueFormNumberInput
            id="venue-width"
            label="공연장 가로"
            value={venue.width}
            error={errors.width}
            required
            disabled={isSubmitting}
            onChange={(value) => updateVenue("width", toRound(value, 2))}
          />
          <VenueFormNumberInput
            id="venue-height"
            label="공연장 세로"
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

      <VenueSeatForm
        venue={venue}
        venueSeats={venueSeats}
        errors={errors}
        venueSeatClientIdRef={venueSeatClientIdRef}
        isSubmitting={isSubmitting}
        setVenue={setVenue}
        setVenueSeats={setVenueSeats}
        setErrors={setErrors}
      />
    </form>
  );
};

export default VenueForm;
