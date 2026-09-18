import { memo, useMemo } from "react";

import { Clock3 } from "lucide-react";

import { formatTime } from "@shared/lib/date.utils";

import type { VenueSeatResponse } from "@entities/venue";

import type { MyGroupHoldInfo } from "../model/seat-map.types";

interface PerformanceSeatMyGroupHoldsProps {
  venueSeatById: Map<number, VenueSeatResponse>;
  myGroupHoldInfoByHoldId: Map<string, MyGroupHoldInfo>;
}

const PerformanceSeatMyGroupHolds = ({ venueSeatById, myGroupHoldInfoByHoldId }: PerformanceSeatMyGroupHoldsProps) => {
  const myGroupHeldSeatCount = useMemo(
    () => Array.from(myGroupHoldInfoByHoldId.values()).reduce((count, { venueSeatIds }) => count + venueSeatIds.length, 0),
    [myGroupHoldInfoByHoldId],
  );

  if (myGroupHeldSeatCount === 0) return null;
  return (
    <section aria-label="내 점유 좌석" className="rounded-2xl border border-emerald-200 bg-linear-to-br from-emerald-50 to-teal-50 p-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="flex size-7 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
            <Clock3 className="size-3.5" aria-hidden />
          </span>

          <p className="text-sm font-extrabold text-emerald-950">내 점유 좌석</p>
        </div>

        <span className="rounded-full bg-white/80 px-2 py-1 text-[11px] font-bold text-emerald-700">{myGroupHeldSeatCount}석</span>
      </div>

      <div className="mt-3 divide-y divide-emerald-100 overflow-hidden rounded-xl border border-emerald-100 bg-white/70">
        {Array.from(myGroupHoldInfoByHoldId.entries()).map(([holdId, { expiresAt, venueSeatIds }]) => {
          const seatLabels = venueSeatIds.map((seatId) => venueSeatById.get(seatId)?.seatLabel).join(", ");
          const formattedExpiresAt = formatTime(expiresAt);
          return (
            <div key={holdId} className="px-3 py-2">
              <div className="flex items-center justify-between gap-3">
                <p className="min-w-0 truncate text-xs font-bold text-slate-800" title={seatLabels}>
                  {seatLabels}
                </p>

                <span className="shrink-0 text-[11px] font-medium text-emerald-700" title={`만료: ${formattedExpiresAt}`}>
                  {formattedExpiresAt}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};

export default memo(PerformanceSeatMyGroupHolds);
