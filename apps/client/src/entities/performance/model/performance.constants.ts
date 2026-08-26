import type { PerformanceStatus, PerformanceStatusItem } from "./performance.types";

export const PERFORMANCE_STATUS_MAP: Record<PerformanceStatus, PerformanceStatusItem> = {
  available: { label: "예매 중", className: "bg-emerald-500 text-white" },
  upcoming: { label: "오픈 예정", className: "bg-violet-600 text-white" },
  ended: { label: "공연 종료", className: "bg-gray-400 text-white" },
};

export const PERFORMANCE_QUERY_KEYS = {
  all: ["performances"] as const,
  detail: (performanceId: number) => [...PERFORMANCE_QUERY_KEYS.all, performanceId] as const,
};
