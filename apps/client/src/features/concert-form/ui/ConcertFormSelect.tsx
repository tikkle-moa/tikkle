import type { CreateConcertRequest } from "@entities/concert";

interface ConcertFormSelectProps {
  field: keyof CreateConcertRequest;
  label: string;
  isSubmitting: boolean;
  value: string | null;
  options: { label: string; value: string }[];
  error?: string;
  updateField: (field: keyof CreateConcertRequest, value: string) => void;
  required?: boolean;
}

const ConcertFormSelect = ({ field, label, isSubmitting, value, options, error, updateField, required = false }: ConcertFormSelectProps) => {
  return (
    <div className="group">
      <label className="text-sm font-semibold text-slate-800" htmlFor={field}>
        {label}
        {required && <span className="ml-1 text-red-500">*</span>}
      </label>

      <select
        aria-describedby={error ? `${field}-error` : undefined}
        aria-invalid={Boolean(error)}
        className={`mt-2 w-full cursor-pointer rounded-xl border bg-white px-4 py-3 text-sm text-slate-900 shadow-xs transition-[border-color,box-shadow] outline-none disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500 ${
          error
            ? "border-red-300 focus:border-red-400 focus:ring-2 focus:ring-red-100"
            : "focus:border-brand-primary border-slate-200 focus:ring-2 focus:ring-violet-100"
        }`}
        disabled={isSubmitting}
        id={field}
        name={field}
        onChange={(e) => updateField(field, e.target.value)}
        value={value ?? ""}
        required={required}
      >
        <option value="" disabled>
          장르를 선택해 주세요
        </option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>

      {error && (
        <p id={`${field}-error`} className="mt-1.5 text-xs font-medium text-red-600">
          {error}
        </p>
      )}
    </div>
  );
};

export default ConcertFormSelect;
