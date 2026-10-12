export interface MyHeldSeatInfo {
  holdId: string;
  expiresAt: Date;
}

export interface MyHoldInfo {
  holdId: string;
  venueSeatIds: number[];
  expiresAt: Date;
}

export interface PerformanceSeatRequestIds {
  seatStatus: string | null;
  hold: string | null;
  release: string | null;
}

export type SeatOperation = "hold" | "release";

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
