import { useResizeTextarea } from "@shared/model/use-resize-textarea";

interface VenueFormTextareaProps {
  id: string;
  label: string;
  value: string | null;
  maxLength?: number;
  error?: string;
  placeholder?: string;
  required?: boolean;
  disabled: boolean;
  onChange: (value: string) => void;
}

const VenueFormTextarea = ({ id, label, value, maxLength, error, placeholder, required, disabled, onChange }: VenueFormTextareaProps) => {
  const errorId = `${id}-error`;
  const { textareaRef } = useResizeTextarea({ value });

  return (
    <div className="group">
      <div className="flex items-end justify-between gap-4">
        <label className="text-sm font-semibold text-slate-800" htmlFor={id}>
          {label}
          {required && <span className="ml-1 text-red-500">*</span>}
        </label>

        {maxLength && (
          <span className="ml-auto text-xs text-slate-400">
            {(value?.length ?? 0).toLocaleString()}/{maxLength.toLocaleString()}
          </span>
        )}
      </div>

      <textarea
        ref={textareaRef}
        value={value ?? ""}
        maxLength={maxLength}
        placeholder={placeholder}
        disabled={disabled}
        aria-describedby={error ? errorId : undefined}
        aria-invalid={Boolean(error)}
        className={`mt-2 min-h-48 w-full resize-none overflow-hidden rounded-xl border bg-white px-4 py-3 text-sm leading-6 text-slate-900 shadow-xs transition-[border-color,box-shadow] outline-none placeholder:text-slate-400 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500 ${
          error
            ? "border-red-300 focus:border-red-400 focus:ring-2 focus:ring-red-100"
            : "focus:border-brand-primary border-slate-200 focus:ring-2 focus:ring-violet-100"
        }`}
        onChange={(e) => onChange(e.target.value)}
        required
      />

      {error && (
        <p id={errorId} className="mt-1.5 text-xs font-medium text-red-600">
          {error}
        </p>
      )}
    </div>
  );
};

export default VenueFormTextarea;
