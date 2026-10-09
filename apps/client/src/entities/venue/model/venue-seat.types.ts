export type VenueSeatState =
  | {
      status: "held_by_me" | "held_by_other";
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
