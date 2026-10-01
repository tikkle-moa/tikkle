import type { components } from "@tikkle/api-types";

export type MyReservation = components["schemas"]["MyReservationResponse"];
export type MyReservationStatus = MyReservation["status"];

export interface MyReservationStatusItem {
  label: string;
  className: string;
}
