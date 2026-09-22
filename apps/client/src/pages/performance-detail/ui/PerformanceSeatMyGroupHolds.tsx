import { memo } from "react";

import { Check, ChevronDown, ChevronUp, Clock3 } from "lucide-react";

import { formatTime } from "@shared/lib/date.utils";
import { useExpandableList } from "@shared/model/use-expandable-list";

import type { VenueSeatResponse } from "@entities/venue";

import { VISIBLE_HOLD_COUNT } from "../model/seat-map.constants";
import type { MyGroupHoldInfo } from "../model/seat-map.types";

interface PerformanceSeatMyGroupHoldsProps {
  venueSeatById: Map<number, VenueSeatResponse>;
  myGroupHolds: MyGroupHoldInfo[];
  myGroupHeldSeatSize: number;
  selectedSeatIds: ReadonlySet<number>;
}

const PerformanceSeatMyGroupHolds = ({ venueSeatById, myGroupHolds, myGroupHeldSeatSize, selectedSeatIds }: PerformanceSeatMyGroupHoldsProps) => {
  const { visibleItems, isExpanded, canExpand, handleToggleExpanded } = useExpandableList({
    items: myGroupHolds,
    visibleCount: VISIBLE_HOLD_COUNT,
  });

  return (
    <section aria-label="내 점유 좌석" className="rounded-2xl border border-emerald-200 bg-linear-to-br from-emerald-50 to-teal-50 p-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="flex size-7 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
            <Clock3 className="size-3.5" aria-hidden />
          </span>

          <p className="text-sm font-extrabold text-emerald-950">내 점유 좌석</p>
        </div>

        <span className="rounded-full bg-white/80 px-2 py-1 text-[11px] font-bold text-emerald-700">{myGroupHeldSeatSize}석</span>
      </div>

      <div className="mt-3 divide-y divide-emerald-100 overflow-hidden rounded-xl border border-emerald-100 bg-white/70">
        {visibleItems.map(({ holdId, expiresAt, venueSeatIds }) => {
          const seatLabels = venueSeatIds.map((seatId) => venueSeatById.get(seatId)?.seatLabel).join(", ");
          const formattedExpiresAt = formatTime(expiresAt);
          const isSelected = venueSeatIds.some((seatId) => selectedSeatIds.has(seatId));
          return (
            <div key={holdId} data-selected={isSelected} className={`px-3 py-2 ${isSelected ? "bg-emerald-100/70" : ""}`}>
              <div className="flex items-center justify-between gap-3">
                <p className="min-w-0 truncate text-xs font-bold text-slate-800" title={seatLabels}>
                  {seatLabels}
                </p>

                <div className="flex shrink-0 items-center gap-1.5">
                  {isSelected && (
                    <span className="flex items-center gap-0.5 text-[10px] font-bold text-emerald-700">
                      <Check className="size-3" aria-hidden />
                      선택됨
                    </span>
                  )}
                  <span className="text-[11px] font-medium text-emerald-700 tabular-nums" title={`만료: ${formattedExpiresAt}`}>
                    {formattedExpiresAt}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
        {canExpand && (
          <button
            type="button"
            className="flex w-full items-center justify-center gap-1.5 border-t border-emerald-100 px-3 py-2 text-[11px] font-bold text-emerald-700 transition-colors hover:bg-emerald-50 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-emerald-500"
            aria-expanded={isExpanded}
            onClick={handleToggleExpanded}
          >
            {isExpanded ? (
              <>
                접기
                <ChevronUp className="size-3.5" aria-hidden />
              </>
            ) : (
              <>
                더보기
                <ChevronDown className="size-3.5" aria-hidden />
              </>
            )}
          </button>
        )}
      </div>
    </section>
  );
};

export default memo(PerformanceSeatMyGroupHolds);
