import type { VenueFormSeat } from "./venue-form.types";

export type VenueSeatListItem = VenueFormSeat & {
  isSelected: boolean;
  hasError: boolean;
};
