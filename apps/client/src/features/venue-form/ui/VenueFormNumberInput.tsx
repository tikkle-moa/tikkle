import { memo } from "react";

import {
  VENUE_FORM_FIELD_ERROR_CLASS_NAME,
  VENUE_FORM_FIELD_STATE_CLASS_NAME,
  VENUE_FORM_FIELD_VALID_CLASS_NAME,
} from "../model/venue-form.constants";

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
        className={`w-full rounded-lg px-3 py-2.5 text-sm transition ${VENUE_FORM_FIELD_STATE_CLASS_NAME} ${
          error ? VENUE_FORM_FIELD_ERROR_CLASS_NAME : VENUE_FORM_FIELD_VALID_CLASS_NAME
        }`}
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
        <p id={errorId} className="mt-1.5 text-xs font-medium whitespace-pre-wrap text-red-600">
          {error}
        </p>
      )}
    </div>
  );
};

export default memo(VenueFormNumberInput);
