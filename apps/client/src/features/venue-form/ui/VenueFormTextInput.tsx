import { memo } from "react";

import {
  VENUE_FORM_FIELD_ERROR_CLASS_NAME,
  VENUE_FORM_FIELD_STATE_CLASS_NAME,
  VENUE_FORM_FIELD_VALID_CLASS_NAME,
} from "../model/venue-form.constants";

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
        className={`w-full rounded-lg px-3 py-2.5 text-sm transition ${VENUE_FORM_FIELD_STATE_CLASS_NAME} ${
          error ? VENUE_FORM_FIELD_ERROR_CLASS_NAME : VENUE_FORM_FIELD_VALID_CLASS_NAME
        }`}
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

export default memo(VenueFormTextInput);
