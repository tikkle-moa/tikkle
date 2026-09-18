export interface MyGroupHeldSeatInfo {
  holdId: string;
  expiresAt: Date;
}

export interface MyGroupHoldInfo {
  expiresAt: Date;
  venueSeatIds: number[];
}

export type SeatOperation = "hold" | "release";

export type RefreshAction = "seatStatus" | "myHeldSeats";

export type SeatOperationState =
  | {
      status: "idle" | "loading" | "success";
      message?: never;
    }
  | {
      status: "error";
      message: string;
    };

export type SeatOperationStatus = SeatOperationState["status"];

export interface ConnectionStyle {
  label: string;
  description: string;
  className: string;
  dotClassName: string;
}
