interface VenueFormNumberInputProps {
  id: string;
  label: string;
  value: number;
  min?: number;
  max?: number | null;
  error?: string;
  required?: boolean;
  disabled: boolean;
  onChange: (value: number) => void;
}

const VenueFormNumberInput = ({ id, label, value, min = 0, max = 999_999.99, error, required, disabled, onChange }: VenueFormNumberInputProps) => {
  const errorId = `${id}-error`;

  return (
    <div>
      <label className="mb-2 block text-sm font-semibold text-slate-700" htmlFor={id}>
        {label}
        {required && <span className="text-red-500"> *</span>}
      </label>

      <input
        id={id}
        type="number"
        value={value}
        min={min}
        max={max ?? undefined}
        step="any"
        disabled={disabled}
        aria-describedby={error ? errorId : undefined}
        aria-invalid={Boolean(error)}
        className={`w-full rounded-lg border bg-white px-3 py-2.5 text-sm text-slate-900 transition outline-none placeholder:text-slate-400 focus:ring-2 ${
          error ? "border-red-300 focus:border-red-400 focus:ring-red-100" : "focus:border-brand-primary border-slate-200 focus:ring-violet-100"
        } disabled:cursor-not-allowed disabled:bg-slate-50`}
        onChange={(event) => {
          const newValue = event.target.valueAsNumber;
          if (isNaN(newValue)) return;
          if (newValue < min) return;
          if (max !== null && newValue > max) return;
          onChange(event.target.valueAsNumber);
        }}
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

export default VenueFormNumberInput;
