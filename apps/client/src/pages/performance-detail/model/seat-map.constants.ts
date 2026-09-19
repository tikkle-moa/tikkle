import type { RefreshAction } from "./seat-map.types";

export const REFRESH_ACTION_MAP: Record<RefreshAction, string> = {
  seatStatus: "좌석 상태",
  myHeldSeats: "내 점유 좌석",
};

export const VISIBLE_HOLD_COUNT = 5;
