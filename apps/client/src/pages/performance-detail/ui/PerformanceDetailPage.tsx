import { Link, generatePath } from "react-router";

import { ArrowLeft, CalendarDays, Clock3, MapPinned, Ticket } from "lucide-react";

import { ROUTE_PATHS } from "@shared/config/router.config";
import { formatDateTime } from "@shared/lib/date.utils";
import DetailMessage from "@shared/ui/DetailMessage";

import { PERFORMANCE_STATUS_MAP } from "@entities/performance";

import PerformanceDetailSkeleton from "./PerformanceDetailSkeleton";
import PerformanceSeatMap from "./PerformanceSeatMap";

import { usePerformanceDetail } from "../model/use-performance-detail";

const PerformanceDetailPage = () => {
  const { performance, seats, isError, isParamValid, isPending } = usePerformanceDetail();

  if (!isParamValid) {
    return <DetailMessage title="잘못된 공연 회차입니다." description="올바르지 않은 공연 회차 ID입니다." />;
  }

  if (isPending) {
    return <PerformanceDetailSkeleton />;
  }

  if (isError || !performance || !seats) {
    return <DetailMessage title="공연 회차를 불러오지 못했습니다." description="잠시 후 다시 시도해 주세요." />;
  }

  const { label: statusLabel, className: statusClassName } = PERFORMANCE_STATUS_MAP[performance.status];

  return (
    <div className="mx-auto w-full max-w-6xl">
      <Link
        className="hover:text-brand-primary inline-flex items-center gap-1.5 text-sm font-semibold text-gray-500 transition-colors"
        to={generatePath(ROUTE_PATHS.CONCERT_DETAIL, {
          concertId: String(performance.concertId),
        })}
      >
        <ArrowLeft className="size-4" aria-hidden />
        콘서트 상세로 돌아가기
      </Link>

      <section
        aria-labelledby="performance-detail-title"
        className="relative mt-5 overflow-hidden rounded-2xl bg-linear-to-br from-indigo-950 via-violet-950 to-fuchsia-950 px-5 py-6 text-white shadow-xl shadow-violet-950/10 sm:px-8 sm:py-8"
      >
        <div aria-hidden className="absolute -top-24 -right-16 size-64 rounded-full bg-fuchsia-500/20 blur-3xl" />
        <div aria-hidden className="absolute -bottom-28 -left-16 size-64 rounded-full bg-indigo-400/20 blur-3xl" />

        <div className="relative grid gap-6 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
          <div>
            <div className="flex items-center gap-2">
              <span className={`${statusClassName} rounded-full px-3 py-1 text-xs font-bold shadow-sm`}>{statusLabel}</span>
              <span className="flex items-center gap-1 text-xs text-violet-200">
                <MapPinned className="size-3" aria-hidden />
                공연 및 좌석 안내
              </span>
            </div>
            <h1 id="performance-detail-title" className="mt-5 text-2xl font-bold tracking-tight sm:text-3xl">
              {performance.name}
            </h1>
            <p className="mt-2 text-sm text-violet-100">공연 #{performance.id}의 일정과 좌석 배치를 확인해 보세요.</p>
          </div>

          <dl
            className={`grid gap-3 ${performance.status === "UPCOMING" && performance.bookingOpensAt != null ? "sm:grid-cols-2 md:min-w-124" : "md:w-60"}`}
          >
            <div className="rounded-xl border border-white/10 bg-white/10 px-4 py-3 backdrop-blur-sm">
              <dt className="flex items-center gap-1.5 text-xs font-medium text-violet-200">
                <CalendarDays className="size-3.5" aria-hidden />
                공연 일시
              </dt>
              <dd className="mt-1.5 text-sm font-bold">
                <time dateTime={performance.startsAt}>{formatDateTime(performance.startsAt)}</time>
              </dd>
            </div>
            {performance.status === "UPCOMING" && performance.bookingOpensAt != null && (
              <div className="rounded-xl border border-white/10 bg-white/10 px-4 py-3 backdrop-blur-sm">
                <dt className="flex items-center gap-1.5 text-xs font-medium text-violet-200">
                  <Clock3 className="size-3.5" aria-hidden />
                  예매 오픈
                </dt>
                <dd className="mt-1.5 text-sm font-bold">
                  <time dateTime={performance.bookingOpensAt}>{formatDateTime(performance.bookingOpensAt)}</time>
                </dd>
              </div>
            )}
          </dl>
        </div>

        <Ticket className="absolute top-5 right-5 size-8 text-white/10 sm:size-12" aria-hidden />
      </section>

      <PerformanceSeatMap performance={performance} seats={seats} />
    </div>
  );
};

export default PerformanceDetailPage;
