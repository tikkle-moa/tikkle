import { AlertCircle, CalendarDays, LoaderCircle } from "lucide-react";

import type { PerformanceFormValues, PerformanceSubmitState } from "../model/performance-form.types";
import { usePerformanceForm } from "../model/use-performance-form";

interface PerformanceFormProps {
  initialValues?: Partial<PerformanceFormValues>;
  submitLabel: string;
  submitState: PerformanceSubmitState;
  onSubmit: (values: PerformanceFormValues) => void | Promise<void>;
  onCancel?: () => void;
}

const PerformanceForm = ({ initialValues, submitLabel, submitState, onSubmit, onCancel }: PerformanceFormProps) => {
  const { values, errors, isSubmitting, updateField, handleSubmit } = usePerformanceForm({
    initialValues,
    submitState,
    onSubmit,
  });

  return (
    <form className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm" noValidate onSubmit={handleSubmit}>
      <div className="flex items-start gap-3">
        <div className="bg-brand-primary/10 text-brand-primary flex size-10 shrink-0 items-center justify-center rounded-xl">
          <CalendarDays className="size-5" aria-hidden />
        </div>

        <div>
          <h2 className="text-base font-bold text-slate-900">공연 회차</h2>
          <p className="mt-1 text-sm leading-6 text-slate-500">공연 시작 시각과 예매 시작 시각을 입력해 주세요.</p>
        </div>
      </div>

      {submitState.status === "error" && (
        <p className="mt-5 flex items-start gap-2 rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-red-700" role="alert">
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
          {submitState.error}
        </p>
      )}

      <div className="mt-6 grid gap-5 sm:grid-cols-2">
        <label className="block text-sm font-semibold text-slate-700">
          공연 시작 시각 <span className="text-red-500">*</span>
          <input
            aria-invalid={Boolean(errors.startsAt)}
            className="mt-2 block w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-900 transition outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 disabled:bg-slate-50"
            disabled={isSubmitting}
            onChange={(event) => updateField("startsAt", event.target.value)}
            type="datetime-local"
            value={values.startsAt}
          />
          {errors.startsAt && <span className="mt-1.5 block text-xs font-medium text-red-600">{errors.startsAt}</span>}
        </label>

        <label className="block text-sm font-semibold text-slate-700">
          예매 시작 시각
          <input
            aria-invalid={Boolean(errors.bookingOpensAt)}
            className="mt-2 block w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-900 transition outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 disabled:bg-slate-50"
            disabled={isSubmitting}
            onChange={(event) => updateField("bookingOpensAt", event.target.value)}
            type="datetime-local"
            value={values.bookingOpensAt}
          />
          {errors.bookingOpensAt && <span className="mt-1.5 block text-xs font-medium text-red-600">{errors.bookingOpensAt}</span>}
        </label>
      </div>

      <div className="mt-6 flex justify-end gap-3">
        {onCancel && (
          <button
            className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={isSubmitting}
            onClick={onCancel}
            type="button"
          >
            취소
          </button>
        )}

        <button
          className="bg-brand-primary inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-white transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={isSubmitting}
          type="submit"
        >
          {isSubmitting && <LoaderCircle className="size-4 animate-spin" aria-hidden />}
          {isSubmitting ? "저장 중..." : submitLabel}
        </button>
      </div>
    </form>
  );
};

export default PerformanceForm;
