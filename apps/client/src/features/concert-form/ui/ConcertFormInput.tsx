import type { CreateConcertRequest } from "@entities/concert";

import { CONCERT_FORM_LIMITS } from "../model/concert-form.constants";

interface ConcertFormInputProps {
  field: Exclude<keyof CreateConcertRequest, "genre" | "venueId">;
  label: string;
  isSubmitting: boolean;
  value: string | null;
  placeholder: string;
  error?: string;
  updateField: <K extends keyof CreateConcertRequest>(field: K, value: CreateConcertRequest[K]) => void;
  required?: boolean;
}

const ConcertFormInput = ({ field, label, isSubmitting, placeholder, value, error, updateField, required = false }: ConcertFormInputProps) => {
  return (
    <div className="group">
      <label className="text-sm font-semibold text-slate-800" htmlFor={field}>
        {label}
        {required && <span className="ml-1 text-red-500">*</span>}
      </label>

      <input
        aria-describedby={error ? `${field}-error` : undefined}
        aria-invalid={Boolean(error)}
        className={`mt-2 w-full rounded-xl border bg-white px-4 py-3 text-sm text-slate-900 shadow-xs transition-[border-color,box-shadow] outline-none placeholder:text-slate-400 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500 ${
          error
            ? "border-red-300 focus:border-red-400 focus:ring-2 focus:ring-red-100"
            : "focus:border-brand-primary border-slate-200 focus:ring-2 focus:ring-violet-100"
        }`}
        disabled={isSubmitting}
        id={field}
        maxLength={CONCERT_FORM_LIMITS[field]}
        name={field}
        onChange={(e) => updateField(field, e.target.value)}
        placeholder={placeholder}
        value={value ?? ""}
        required={required}
      />

      <div className="mt-1.5 flex min-h-5 items-start justify-between gap-3">
        {error && (
          <p id={`${field}-error`} className="mt-1.5 text-xs font-medium text-red-600">
            {error}
          </p>
        )}

        <span className="ml-auto text-xs text-slate-400">
          {(value?.length ?? 0).toLocaleString()}/{CONCERT_FORM_LIMITS[field].toLocaleString()}
        </span>
      </div>
    </div>
  );
};

export default ConcertFormInput;
