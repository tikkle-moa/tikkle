export type VenueSeatState =
  | {
      status: "held_by_my_group" | "held_by_other_group";
      expiresAt: Date;
    }
  | {
      status: "available" | "booked";
      expiresAt?: never;
    };

export type VenueSeatStatus = VenueSeatState["status"];

export interface VenueSeatStyle {
  label: string;
  style: string;
  fill: string;
  stroke: string;
}
