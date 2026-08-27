import { Link, generatePath } from "react-router";

import { CalendarDays, ChevronRight } from "lucide-react";

import { ROUTE_PATHS } from "@shared/config/router.config";
import { formatDateTime } from "@shared/lib/date.utils";

import { PERFORMANCE_STATUS_MAP } from "@entities/performance";
import type { PerformanceResponse } from "@entities/performance";

interface PerformanceBookingPanelProps {
  performances: PerformanceResponse[];
}

const PerformanceBookingPanel = ({ performances }: PerformanceBookingPanelProps) => {
  if (performances.length === 0) {
    return (
      <aside className="h-fit overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <h2 className="text-base font-bold text-gray-900">공연 회차</h2>
          <span className="text-xs font-medium text-gray-400">총 0회</span>
        </div>

        <div className="px-5 py-6">
          <div className="rounded-xl border border-dashed border-violet-200 bg-linear-to-b from-violet-50/80 to-white px-4 py-7 text-center">
            <div className="text-brand-primary mx-auto grid size-12 place-items-center rounded-full bg-white shadow-sm ring-1 ring-violet-100">
              <CalendarDays className="size-5" aria-hidden />
            </div>

            <p className="mt-4 text-sm font-bold text-gray-900">등록된 공연 회차가 없습니다</p>
            <p className="mt-2 text-xs leading-5 text-gray-500">
              새로운 회차가 등록되면
              <br />
              공연 일시와 예매 정보를 확인할 수 있어요.
            </p>
          </div>

          <p className="mt-4 rounded-lg bg-gray-50 px-3 py-2 text-center text-xs leading-5 text-gray-500">콘서트 정보는 계속 둘러볼 수 있습니다.</p>
        </div>
      </aside>
    );
  }

  return (
    <aside className="h-fit overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
        <h2 className="text-base font-bold text-gray-900">공연 회차</h2>
        <span className="text-xs font-medium text-gray-400">총 {performances.length}회</span>
      </div>

      <ul
        aria-label="공연 회차 목록"
        className="scrollbar-thumb-brand-primary/60 max-h-70 scrollbar-thin divide-y divide-gray-100 overflow-y-auto overscroll-contain px-5"
      >
        {performances.map((performance) => {
          const { label: statusLabel, className: statusClassName } = PERFORMANCE_STATUS_MAP[performance.status];

          return (
            <li key={performance.id}>
              <Link
                className="group flex items-center gap-3 py-4"
                to={generatePath(ROUTE_PATHS.PERFORMANCE_DETAIL, { performanceId: String(performance.id) })}
              >
                <div className="min-w-0 grow">
                  <div className="flex items-center gap-2">
                    <p className="group-hover:text-brand-primary truncate text-sm font-bold text-gray-900 transition-colors">{performance.name}</p>
                    <span className={`${statusClassName} shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold`}>{statusLabel}</span>
                  </div>

                  <time className="mt-1 block text-xs font-medium text-gray-600" dateTime={performance.startsAt}>
                    {formatDateTime(performance.startsAt)}
                  </time>

                  {performance.status === "UPCOMING" && performance.bookingOpensAt && (
                    <p className="mt-1 text-[11px] text-violet-600">{formatDateTime(performance.bookingOpensAt)} 오픈</p>
                  )}
                </div>

                <ChevronRight
                  className="size-4 shrink-0 text-gray-300 transition-transform group-hover:translate-x-0.5 group-hover:text-violet-500"
                  aria-hidden
                />
              </Link>
            </li>
          );
        })}
      </ul>

      <p className="mx-5 mb-5 rounded-lg bg-gray-50 px-3 py-2 text-xs leading-5 text-gray-500">
        회차를 선택하면 상세 정보와 좌석 배치를 확인할 수 있습니다.
      </p>
    </aside>
  );
};

export default PerformanceBookingPanel;
