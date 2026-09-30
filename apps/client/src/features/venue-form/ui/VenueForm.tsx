import { AlertCircle, Building2, CircleAlert, LoaderCircle } from "lucide-react";

import type { SubmitState } from "@shared/model/form.types";

import type { CreateVenueRequest, VenueDetailResponse } from "@entities/venue";

import VenueInfoForm from "./VenueInfoForm";
import VenueSeatForm from "./VenueSeatForm";
import VenueStageForm from "./VenueStageForm";

import { useVenueForm } from "../model/use-venue-form";
import type { VenueFormMode, VenueFormSeat } from "../model/venue-form.types";

interface VenueFormProps {
  mode: VenueFormMode;
  initialValues?: VenueDetailResponse;
  submitState: SubmitState;
  onSubmit: (venue: CreateVenueRequest, venueSeats: VenueFormSeat[]) => void | Promise<void>;
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
          className="m-4 flex items-center gap-2 rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium whitespace-pre-wrap text-red-700 sm:mx-6"
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

      <VenueInfoForm venue={venue} errors={errors} isSubmitting={isSubmitting} updateVenue={updateVenue} />

      <VenueStageForm venue={venue} errors={errors} isSubmitting={isSubmitting} updateVenue={updateVenue} />

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
