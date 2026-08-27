import { Link, generatePath } from "react-router";

import { CalendarDays, ChevronRight, Pencil, Plus, Trash2 } from "lucide-react";

import { ROUTE_PATHS } from "@shared/config/router.config";
import { formatDateTime } from "@shared/lib/date.utils";

import { PERFORMANCE_STATUS_MAP } from "@entities/performance";
import type { PerformanceResponse } from "@entities/performance";

import { PerformanceForm, toPerformanceFormValues } from "@features/performance-form";

import { usePerformanceBookingPanel } from "../model/use-performance-booking-panel";

interface PerformanceBookingPanelProps {
  concertId: number;
  isAdmin: boolean;
  onChanged: () => Promise<unknown>;
  performances: PerformanceResponse[];
}

const PerformanceBookingPanel = ({ concertId, isAdmin, onChanged, performances }: PerformanceBookingPanelProps) => {
  const {
    editingPerformanceIds,
    isCreateOpen,
    deletingPerformanceIds,
    handleEditOpen,
    handleEditClose,
    handleCreateOpen,
    handleCreateClose,
    handleDelete,
  } = usePerformanceBookingPanel(onChanged);

  const hasPerformances = performances.length > 0;

  return (
    <aside className="h-fit overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
        <h2 className="text-base font-bold text-gray-900">공연 회차</h2>
        <span className="text-xs font-medium text-gray-400">총 {performances.length}회</span>
      </div>

      {!hasPerformances && !isCreateOpen && (
        <div className="px-5 py-6">
          <div className="rounded-xl border border-dashed border-violet-200 bg-linear-to-b from-violet-50/80 to-white px-4 py-7 text-center">
            <div className="text-brand-primary mx-auto grid size-12 place-items-center rounded-full bg-white shadow-sm ring-1 ring-violet-100">
              <CalendarDays aria-hidden className="size-5" />
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
      )}

      {hasPerformances && (
        <ul
          aria-label="공연 회차 목록"
          className="scrollbar-thumb-brand-primary/60 max-h-70 scrollbar-thin divide-y divide-gray-100 overflow-y-auto overscroll-contain px-5"
        >
          {performances.map((performance) => {
            const isEditing = editingPerformanceIds.has(performance.id);
            const isDeleting = deletingPerformanceIds.has(performance.id);

            if (isEditing) {
              return (
                <li className="-mx-5 bg-violet-50/40 px-5 py-3" key={performance.id}>
                  <PerformanceForm
                    concertId={concertId}
                    initialValues={toPerformanceFormValues(performance)}
                    onCancel={() => handleEditClose(performance.id)}
                    onSaved={onChanged}
                    onSuccess={() => handleEditClose(performance.id)}
                    performanceId={performance.id}
                    submitLabel="저장"
                  />
                </li>
              );
            }

            const { label: statusLabel, className: statusClassName } = PERFORMANCE_STATUS_MAP[performance.status];
            const isDisabled = performance.status === "ENDED";
            const content = (
              <>
                <div className="min-w-0 grow">
                  <div className="flex items-center gap-2">
                    <p
                      className={`truncate text-sm font-bold transition-colors ${
                        isDisabled ? "text-gray-400" : "text-gray-900 group-hover:text-violet-700"
                      }`}
                    >
                      {performance.name}
                    </p>
                    <span className={`${statusClassName} shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold`}>{statusLabel}</span>
                  </div>

                  <time
                    className={`mt-1 block text-xs font-medium ${isDisabled ? "text-gray-400" : "text-gray-600"}`}
                    dateTime={performance.startsAt}
                  >
                    {formatDateTime(performance.startsAt)}
                  </time>

                  {performance.status === "UPCOMING" && performance.bookingOpensAt && (
                    <p className="mt-1 text-[11px] text-violet-600">{formatDateTime(performance.bookingOpensAt)} 오픈</p>
                  )}
                </div>
              </>
            );

            return (
              <li className={`group ${isDisabled ? "-mx-5 bg-gray-50 px-5" : ""}`} key={performance.id}>
                <div className="flex items-center gap-2">
                  {isDisabled ? (
                    <div aria-disabled="true" className="flex min-w-0 grow cursor-not-allowed items-center gap-3 py-4 opacity-80">
                      {content}
                    </div>
                  ) : (
                    <Link
                      className="flex min-w-0 grow items-center gap-3 py-4"
                      to={generatePath(ROUTE_PATHS.PERFORMANCE_DETAIL, { performanceId: String(performance.id) })}
                    >
                      {content}
                    </Link>
                  )}

                  {isAdmin && (
                    <div className="flex shrink-0 gap-1 transition-opacity sm:opacity-0 sm:group-focus-within:opacity-100 sm:group-hover:opacity-100">
                      {!isDisabled && (
                        <button
                          aria-label="공연 회차 수정"
                          className="inline-flex size-8 items-center justify-center rounded-md text-gray-500 hover:bg-violet-50 hover:text-violet-700 disabled:opacity-50"
                          disabled={isDeleting}
                          onClick={() => handleEditOpen(performance.id)}
                          type="button"
                        >
                          <Pencil aria-hidden className="size-4" />
                        </button>
                      )}

                      <button
                        aria-label="공연 회차 삭제"
                        className="inline-flex size-8 items-center justify-center rounded-md text-gray-500 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                        disabled={isDeleting}
                        onClick={() => handleDelete(performance.id)}
                        type="button"
                      >
                        <Trash2 aria-hidden className="size-4" />
                      </button>
                    </div>
                  )}

                  {!isDisabled && (
                    <Link
                      aria-label={`${performance.name} 상세 보기`}
                      className="inline-flex size-8 shrink-0 items-center justify-center rounded-md text-gray-300 transition hover:bg-violet-50 hover:text-violet-500"
                      to={generatePath(ROUTE_PATHS.PERFORMANCE_DETAIL, { performanceId: String(performance.id) })}
                    >
                      <ChevronRight aria-hidden className="size-4 transition-transform group-hover:translate-x-0.5" />
                    </Link>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {hasPerformances && (
        <p className="mx-5 mb-5 rounded-lg bg-gray-50 px-3 py-2 text-xs leading-5 text-gray-500">
          회차를 선택하면 상세 정보와 좌석 배치를 확인할 수 있습니다.
        </p>
      )}

      {isAdmin &&
        (isCreateOpen ? (
          <div className="border-t border-gray-100 bg-violet-50/40 px-5 py-3">
            <PerformanceForm
              concertId={concertId}
              onCancel={handleCreateClose}
              onSaved={onChanged}
              onSuccess={handleCreateClose}
              submitLabel="등록"
            />
          </div>
        ) : (
          <div className={hasPerformances ? "border-t border-gray-100 p-3" : "px-5 pb-5"}>
            <button
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-violet-300 bg-violet-50 px-3 py-2.5 text-sm font-semibold text-violet-700"
              onClick={handleCreateOpen}
              type="button"
            >
              <Plus aria-hidden className="size-4" />
              공연 회차 추가
            </button>
          </div>
        ))}
    </aside>
  );
};

export default PerformanceBookingPanel;
