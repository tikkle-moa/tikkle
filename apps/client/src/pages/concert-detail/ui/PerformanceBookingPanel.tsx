import { Link, generatePath } from "react-router";

import { CalendarDays, ChevronRight } from "lucide-react";

import { ROUTE_PATHS } from "@shared/config/router.config";
import { formatDateTime } from "@shared/lib/date.utils";

import type { PerformanceResponse } from "@entities/performance";

interface PerformanceBookingPanelProps {
  performances: PerformanceResponse[];
}

const PerformanceBookingPanel = ({ performances }: PerformanceBookingPanelProps) => {
  if (performances.length === 0) {
    return (
      <aside className="h-fit rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <h2 className="text-base font-bold text-gray-900">예매하기</h2>
          <span className="text-xs text-gray-400">01 회차 선택</span>
        </div>

        <div className="px-5 py-7 text-center">
          <div className="text-brand-primary mx-auto grid size-12 place-items-center rounded-full bg-violet-50">
            <CalendarDays className="size-5" aria-hidden />
          </div>

          <p className="mt-3 text-sm font-bold text-gray-900">예매 회차를 준비 중입니다</p>
          <p className="mt-2 text-xs leading-5 text-gray-500">
            공연 정보는 둘러볼 수 있어요.
            <br />
            회차가 등록되면 예매가 시작됩니다.
          </p>

          <button className="mt-5 w-full rounded-lg bg-gray-200 py-3 text-sm font-bold text-gray-400" disabled type="button">
            좌석 선택하기
          </button>
        </div>
      </aside>
    );
  }

  return (
    <aside className="h-fit rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <h2 className="text-base font-bold text-gray-900">공연 회차</h2>

      <ul className="mt-4 divide-y divide-gray-100">
        {performances.map((performance) => (
          <li key={performance.id}>
            <Link
              className="hover:text-brand-primary flex items-center justify-between gap-3 py-3 text-sm font-medium text-gray-700 transition-colors"
              to={generatePath(ROUTE_PATHS.PERFORMANCE_DETAIL, { performanceId: String(performance.id) })}
            >
              {formatDateTime(performance.startsAt)}
              <ChevronRight className="size-4 shrink-0 text-gray-400" aria-hidden />
            </Link>
          </li>
        ))}
      </ul>

      <p className="mt-4 rounded-lg bg-gray-50 px-3 py-2 text-xs leading-5 text-gray-500">좌석 선택은 회차별 좌석 화면에서 진행합니다.</p>
    </aside>
  );
};

export default PerformanceBookingPanel;
