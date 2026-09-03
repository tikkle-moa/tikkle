import type { CreateVenueRequest } from "@entities/venue";

export const VENUE_FORM_LIMITS = {
  venueName: 100,
  venueAddress: 200,
  venueDescription: 10_000,
  venueSeatSection: 50,
  venueSeatLabel: 50,
  venueSeatBatchSize: 500,
} as const;

export const EMPTY_VENUE_FORM_VALUES: CreateVenueRequest = {
  name: "",
  address: "",
  description: "",
  width: 100,
  height: 100,
  stagePositionX: 50,
  stagePositionY: 5,
  stageWidth: 40,
  stageHeight: 10,
};

export const BASIC_ERROR_KEYS = new Set(["name", "address", "description"]);

export const LAYOUT_ERROR_KEYS = new Set(["width", "height", "stagePositionX", "stagePositionY", "stageWidth", "stageHeight"]);

export const VENUE_FORM_FIELD_STATE_CLASS_NAME =
  "border bg-white text-slate-900 outline-none placeholder:text-slate-400 focus:ring-2 disabled:cursor-not-allowed disabled:bg-slate-50";

export const VENUE_FORM_FIELD_VALID_CLASS_NAME = "border-slate-200 focus:border-brand-primary focus:ring-violet-100";

export const VENUE_FORM_FIELD_ERROR_CLASS_NAME = "border-red-300 focus:border-red-400 focus:ring-red-100";
