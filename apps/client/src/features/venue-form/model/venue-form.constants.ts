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
