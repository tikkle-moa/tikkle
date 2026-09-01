interface VenueFormTextInputProps {
  id: string;
  label: string;
  value: string;
  maxLength?: number;
  error?: string;
  placeholder?: string;
  required?: boolean;
  disabled: boolean;
  onChange: (value: string) => void;
}

const VenueFormTextInput = ({ id, label, value, maxLength, error, placeholder, required, disabled, onChange }: VenueFormTextInputProps) => {
  const errorId = `${id}-error`;

  return (
    <div>
      <div className="mb-2 flex items-end justify-between gap-4">
        <label className="text-sm font-semibold text-slate-800" htmlFor={id}>
          {label}
          {required && <span className="ml-1 text-red-500">*</span>}
        </label>

        {maxLength && (
          <span className="ml-auto text-xs text-slate-400">
            {value.length.toLocaleString()}/{maxLength.toLocaleString()}
          </span>
        )}
      </div>

      <input
        id={id}
        type="text"
        value={value}
        maxLength={maxLength}
        placeholder={placeholder}
        disabled={disabled}
        aria-describedby={error ? errorId : undefined}
        aria-invalid={Boolean(error)}
        className={`w-full rounded-lg border bg-white px-3 py-2.5 text-sm text-slate-900 transition outline-none placeholder:text-slate-400 focus:ring-2 ${
          error ? "border-red-300 focus:border-red-400 focus:ring-red-100" : "focus:border-brand-primary border-slate-200 focus:ring-violet-100"
        } disabled:cursor-not-allowed disabled:bg-slate-50`}
        onChange={(event) => onChange(event.target.value)}
        required={required}
      />

      {error && (
        <p id={errorId} className="mt-1.5 text-xs font-medium text-red-600">
          {error}
        </p>
      )}
    </div>
  );
};

export default VenueFormTextInput;
