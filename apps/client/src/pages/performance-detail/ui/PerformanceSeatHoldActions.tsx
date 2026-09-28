import { memo } from "react";

import { ChevronRight, CircleAlert, LoaderCircle, RotateCcw, TicketCheck } from "lucide-react";

import type { SeatOperationState } from "../model/seat-map.types";

interface PerformanceSeatHoldActionsProps {
  myGroupHeldSeatSize: number;
  myGroupHeldSeatTotalPrice: number;
  selectedSeatIdsToReleaseSize: number;
  isConnected: boolean;
  isCheckoutReviewBeginning: boolean;
  visibleSeatOperationState: SeatOperationState;
  handleCheckout: () => void;
  handleReleaseSeats: () => void;
}

const PerformanceSeatHoldActions = ({
  myGroupHeldSeatSize,
  myGroupHeldSeatTotalPrice,
  selectedSeatIdsToReleaseSize,
  isConnected,
  isCheckoutReviewBeginning,
  visibleSeatOperationState,
  handleCheckout,
  handleReleaseSeats,
}: PerformanceSeatHoldActionsProps) => {
  return (
    <>
      {myGroupHeldSeatSize > 0 && (
        <button
          type="button"
          onClick={handleCheckout}
          disabled={!isConnected || isCheckoutReviewBeginning}
          className="group flex w-full items-center gap-3 rounded-2xl border border-violet-100 bg-violet-50/60 px-4 py-3.5 text-left transition hover:border-violet-200 hover:bg-violet-50 focus-visible:ring-2 focus-visible:ring-violet-200 focus-visible:ring-offset-2 focus-visible:outline-none"
        >
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-white text-violet-600 shadow-sm">
            <TicketCheck className="size-4" aria-hidden />
          </span>

          <span className="min-w-0 flex-1">
            <span className="block text-xs font-extrabold text-slate-800">
              {isCheckoutReviewBeginning ? "예매 정보 불러오는 중..." : "예매 정보 확인하기"}
            </span>
            <span className="mt-0.5 block text-[11px] text-slate-500">
              선택 좌석 {myGroupHeldSeatSize}석 · {myGroupHeldSeatTotalPrice.toLocaleString()}원
            </span>
          </span>

          <ChevronRight className="size-4 shrink-0 text-violet-400 transition-transform group-hover:translate-x-0.5" aria-hidden />
        </button>
      )}
      {selectedSeatIdsToReleaseSize > 0 && (
        <div className="grid grid-cols-1 gap-2">
          <button
            type="button"
            className="flex min-h-11 items-center justify-center gap-1.5 rounded-xl border border-fuchsia-200 bg-white px-3 py-2.5 text-xs font-extrabold text-fuchsia-700 transition hover:bg-fuchsia-50 focus-visible:ring-2 focus-visible:ring-fuchsia-200 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400"
            disabled={!isConnected || visibleSeatOperationState.status === "loading"}
            onClick={handleReleaseSeats}
          >
            {visibleSeatOperationState.status === "loading" ? (
              <LoaderCircle className="size-3.5 animate-spin" aria-hidden />
            ) : (
              <RotateCcw className="size-3.5" aria-hidden />
            )}

            {visibleSeatOperationState.status === "loading" ? "처리 중" : `점유 해제 · ${selectedSeatIdsToReleaseSize}석`}
          </button>
        </div>
      )}
      {visibleSeatOperationState.status === "error" && (
        <div className="flex items-start gap-2.5 rounded-2xl border border-red-100 bg-red-50 px-3.5 py-3 text-xs leading-5 text-red-700" role="alert">
          <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span>{visibleSeatOperationState.message}</span>
        </div>
      )}
    </>
  );
};

export default memo(PerformanceSeatHoldActions);
