import type { MyReservation, MyReservationStatus } from "@entities/reservation";

export type MyReservationFilterId = "SUCCEEDED" | "ALL" | "PENDING" | "CANCELLATION_OR_REFUND" | "EXPIRED" | "FAILED";

export interface MyReservationFilterOption {
  id: MyReservationFilterId;
  label: string;
  statuses: readonly MyReservationStatus[] | null;
}

export interface MyReservationFilterProps {
  reservations: MyReservation[];
}
