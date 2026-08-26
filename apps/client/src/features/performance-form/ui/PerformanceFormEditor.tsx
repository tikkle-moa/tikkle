import { AlertCircle, LoaderCircle } from "lucide-react";

import type { PerformanceFormValues, PerformanceSubmitState } from "../model/performance-form.types";
import { usePerformanceFormEditor } from "../model/use-performance-form-editor";

interface PerformanceFormEditorProps {
  initialValues?: Partial<PerformanceFormValues>;
  submitLabel: string;
  submitState: PerformanceSubmitState;
  onSubmit: (values: PerformanceFormValues) => void | Promise<void>;
  onCancel: () => void;
}

const PerformanceFormEditor = ({ initialValues, submitLabel, submitState, onSubmit, onCancel }: PerformanceFormEditorProps) => {
  const { values, errors, isSubmitting, updateField, handleSubmit } = usePerformanceFormEditor({
    initialValues,
    submitState,
    onSubmit,
  });

  return (
    <form className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-end" noValidate onSubmit={handleSubmit}>
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

      <div className="flex gap-2 sm:pb-px">
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
          {isSubmitting && <LoaderCircle className="size-4 animate-spin" aria-hidden />}
          {isSubmitting ? "저장 중..." : submitLabel}
        </button>
      </div>

      {submitState.status === "error" && (
        <p
          className="flex items-start gap-2 rounded-md border border-red-100 bg-red-50 px-3 py-2 text-xs font-medium text-red-700 sm:col-span-3"
          role="alert"
        >
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
          {submitState.error}
        </p>
      )}
    </form>
  );
};

export default PerformanceFormEditor;
