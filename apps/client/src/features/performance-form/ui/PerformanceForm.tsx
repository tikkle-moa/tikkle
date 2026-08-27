import { AlertCircle, LoaderCircle } from "lucide-react";

import type { PerformanceFormValues } from "../model/performance-form.types";
import { usePerformanceForm } from "../model/use-performance-form";

interface PerformanceFormProps {
  concertId: number;
  performanceId?: number;
  initialValues?: Partial<PerformanceFormValues>;
  submitLabel: string;
  onCancel: () => void;
  onSaved: () => Promise<unknown>;
  onSuccess: () => void;
}

const PerformanceForm = ({ concertId, performanceId, initialValues, submitLabel, onCancel, onSaved, onSuccess }: PerformanceFormProps) => {
  const { values, errors, submitState, isSubmitting, updateField, handleSubmit } = usePerformanceForm({
    concertId,
    performanceId,
    initialValues,
    onSaved,
    onSuccess,
  });

  return (
    <form className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,12rem),1fr))] items-end gap-3" noValidate onSubmit={handleSubmit}>
      <label className="block text-xs font-semibold text-slate-700">
        공연 회차명 <span className="text-red-500">*</span>
        <input
          aria-invalid={Boolean(errors.name)}
          className="mt-1.5 block w-full rounded-md border border-slate-200 bg-white px-2.5 py-2 text-sm text-slate-900 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
          disabled={isSubmitting}
          onChange={(event) => updateField("name", event.target.value)}
          placeholder="예: 8월 29일 저녁 공연"
          type="text"
          value={values.name}
        />
        {errors.name && <span className="mt-1 block text-xs font-medium text-red-600">{errors.name}</span>}
      </label>

      <label className="block text-xs font-semibold text-slate-700">
        공연 시작 시각 <span className="text-red-500">*</span>
        <input
          aria-invalid={Boolean(errors.startsAt)}
          className="mt-1.5 block w-full rounded-md border border-slate-200 bg-white px-2.5 py-2 text-sm text-slate-900 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
          disabled={isSubmitting}
          onChange={(event) => updateField("startsAt", event.target.value)}
          type="datetime-local"
          value={values.startsAt}
        />
        {errors.startsAt && <span className="mt-1 block text-xs font-medium text-red-600">{errors.startsAt}</span>}
      </label>

      <label className="block text-xs font-semibold text-slate-700">
        예매 시작 시각
        <input
          aria-invalid={Boolean(errors.bookingOpensAt)}
          className="mt-1.5 block w-full rounded-md border border-slate-200 bg-white px-2.5 py-2 text-sm text-slate-900 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
          disabled={isSubmitting}
          onChange={(event) => updateField("bookingOpensAt", event.target.value)}
          type="datetime-local"
          value={values.bookingOpensAt}
        />
        {errors.bookingOpensAt && <span className="mt-1 block text-xs font-medium text-red-600">{errors.bookingOpensAt}</span>}
      </label>

      <div className="flex gap-2 pb-px">
        <button
          className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
          disabled={isSubmitting}
          onClick={onCancel}
          type="button"
        >
          취소
        </button>

        <button
          className="bg-brand-primary inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
          disabled={isSubmitting}
          type="submit"
        >
          {isSubmitting && <LoaderCircle aria-hidden className="size-4 animate-spin" />}
          {isSubmitting ? "저장 중..." : submitLabel}
        </button>
      </div>

      {submitState.status === "error" && (
        <p
          className="col-span-full flex items-start gap-2 rounded-md border border-red-100 bg-red-50 px-3 py-2 text-xs font-medium text-red-700"
          role="alert"
        >
          <AlertCircle aria-hidden className="mt-0.5 size-4 shrink-0" />
          {submitState.error}
        </p>
      )}
    </form>
  );
};

export default PerformanceForm;
