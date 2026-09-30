import type { PerformanceStatus, PerformanceStatusItem } from "./performance.types";

export const PERFORMANCE_STATUS_MAP: Record<PerformanceStatus, PerformanceStatusItem> = {
  UPCOMING: { label: "오픈 예정", className: "bg-violet-500 text-white ring-1 ring-inset ring-violet-300/50" },
  AVAILABLE: { label: "예매 중", className: "bg-emerald-500 text-white ring-1 ring-inset ring-emerald-300/50" },
  SOLD_OUT: { label: "매진", className: "bg-rose-500 text-white ring-1 ring-inset ring-rose-300/50" },
  ENDED: { label: "공연 종료", className: "bg-slate-600 text-slate-100 ring-1 ring-inset ring-slate-400/50" },
};

export const PERFORMANCE_QUERY_KEYS = {
  all: ["performances"] as const,
  detail: (performanceId: number) => [...PERFORMANCE_QUERY_KEYS.all, performanceId] as const,
};
