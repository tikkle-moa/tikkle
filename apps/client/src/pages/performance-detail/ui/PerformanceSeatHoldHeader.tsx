import { memo } from "react";

import { Armchair, CircleAlert, RefreshCw } from "lucide-react";

import { PERFORMANCE_STATUS_MAP } from "@entities/performance";

import type { ConnectionStyle } from "../model/seat-map.types";

interface PerformanceSeatHoldHeaderProps {
  connectionStyle: ConnectionStyle;
  isConnected: boolean;
  isRefreshing: boolean;
  refreshError: string | null;
  handleRefresh: () => void;
}

const PerformanceSeatHoldHeader = ({ connectionStyle, isConnected, isRefreshing, refreshError, handleRefresh }: PerformanceSeatHoldHeaderProps) => {
  return (
    <div className="space-y-3 border-b border-slate-100 bg-linear-to-br from-violet-100 via-slate-50 to-fuchsia-100 px-3 py-4 sm:px-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-violet-600 text-white shadow-lg shadow-violet-200">
            <Armchair className="size-5" aria-hidden />
          </span>

          <div className="min-w-0">
            <h2 className="truncate text-lg font-extrabold tracking-tight text-slate-950">좌석 선택</h2>
          </div>
        </div>

        <span className="shrink-0 rounded-full bg-white/80 px-2.5 py-1 text-[11px] font-bold text-violet-700 ring-1 ring-violet-100">
          {PERFORMANCE_STATUS_MAP.AVAILABLE.label}
        </span>
      </div>
      <div className={`flex items-center gap-3 rounded-2xl border px-3.5 py-3 ${connectionStyle.className}`} role="status">
        <span className={`size-2 shrink-0 rounded-full ${connectionStyle.dotClassName}`} aria-hidden />

        <div className="min-w-0 flex-1">
          <p className="text-xs font-extrabold">{connectionStyle.label}</p>
          <p className="mt-0.5 text-[11px] leading-4 opacity-80">{connectionStyle.description}</p>
        </div>

        {isConnected && (
          <button
            type="button"
            aria-label={isRefreshing ? "좌석 상태 새로고침 중" : "좌석 상태 새로고침"}
            className="flex size-7 shrink-0 items-center justify-center rounded-lg transition hover:bg-black/5 focus-visible:ring-2 focus-visible:ring-current/20 focus-visible:outline-none disabled:cursor-wait"
            disabled={isRefreshing}
            onClick={handleRefresh}
          >
            <RefreshCw className={`size-3.5 ${isRefreshing ? "animate-spin" : ""}`} aria-hidden />
          </button>
        )}
      </div>
      {!isRefreshing && refreshError && (
        <div className="rounded-xl border border-red-200 bg-red-50/80 px-3.5 py-2.5 text-red-700" role="alert">
          <div className="flex items-center gap-1.5">
            <CircleAlert className="size-3.5 shrink-0" aria-hidden />
            <p className="text-xs font-extrabold">좌석 정보 동기화</p>
          </div>

          <p className="mt-1.5 text-[11px] leading-4 font-bold whitespace-pre-line opacity-80">{refreshError}</p>
        </div>
      )}
    </div>
  );
};

export default memo(PerformanceSeatHoldHeader);
