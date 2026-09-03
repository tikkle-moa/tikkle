import type { CreateVenueSeatRequest } from "@entities/venue";

export type VenueFormSeat = { clientId: number } & CreateVenueSeatRequest;

export type VenueFormMode = "create" | "edit";

export type VenueFormErrors = Record<string, string>;

export interface VenueSeatHistoryEntry {
  venueSeats: VenueFormSeat[];
  collisionMap: Map<number, Set<number>>;
}
