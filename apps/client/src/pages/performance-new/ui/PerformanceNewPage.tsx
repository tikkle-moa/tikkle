import { AlertTriangle, CalendarPlus, LoaderCircle, Pencil, Plus, Trash2 } from "lucide-react";

import { ConcertManageIntro } from "@features/concert-manage";
import { PerformanceForm, toPerformanceFormValues } from "@features/performance-form";

import { usePerformanceNew } from "../model/use-performance-new";

const PerformanceNewPage = () => {
  const {
    concertId,
    concert,
    performances,
    isParamValid,
    isPending,
    isError,
    refetch,
    editingPerformanceIds,
    isCreateOpen,
    deletingPerformanceIds,
    handleEditOpen,
    handleEditCancel,
    handleCreateOpen,
    handleCreateClose,
    handleDelete,
    handleComplete,
  } = usePerformanceNew();

  if (!isParamValid) {
    return (
      <section
        className="mx-auto flex min-h-72 w-full max-w-4xl flex-col items-center justify-center rounded-2xl border border-red-100 bg-white px-6 py-16 text-center shadow-sm"
        role="alert"
      >
        <AlertTriangle aria-hidden className="size-7 text-red-500" />
        <h1 className="mt-4 text-lg font-bold text-slate-900">잘못된 콘서트입니다.</h1>
        <p className="mt-2 text-sm text-slate-500">올바른 콘서트에서 공연 회차를 등록해 주세요.</p>
      </section>
    );
  }

  if (isPending) {
    return (
      <section
        aria-busy="true"
        aria-live="polite"
        className="mx-auto flex min-h-72 w-full max-w-4xl items-center justify-center rounded-2xl border border-slate-200 bg-white"
        role="status"
      >
        <LoaderCircle aria-hidden className="text-brand-primary size-7 animate-spin" />
        <span className="sr-only">콘서트 정보를 불러오는 중입니다.</span>
      </section>
    );
  }

  if (isError || !concert) {
    return (
      <section
        className="mx-auto flex min-h-72 w-full max-w-4xl flex-col items-center justify-center rounded-2xl border border-red-100 bg-white px-6 py-16 text-center shadow-sm"
        role="alert"
      >
        <AlertTriangle aria-hidden className="size-7 text-red-500" />
        <h1 className="mt-4 text-lg font-bold text-slate-900">콘서트 정보를 불러오지 못했습니다.</h1>
        <p className="mt-2 text-sm text-slate-500">잠시 후 다시 시도해 주세요.</p>
      </section>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 sm:gap-8">
      <ConcertManageIntro
        Icon={CalendarPlus}
        description="여러 회차를 연속으로 추가하고, 등록한 회차를 바로 수정하거나 삭제할 수 있습니다."
        title="공연 회차 등록"
      />

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <header className="flex items-center justify-between gap-4 border-b border-slate-100 px-5 py-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">공연 회차</h2>
            <p className="mt-1 text-xs text-slate-400">총 {performances.length}개의 공연 일정</p>
          </div>

          <button className="bg-brand-primary rounded-lg px-3 py-2 text-sm font-semibold text-white" onClick={handleComplete} type="button">
            완료
          </button>
        </header>

        <ul className="divide-y divide-slate-100">
          {performances.map((performance) => {
            const isEditing = editingPerformanceIds.has(performance.id);
            const isDeleting = deletingPerformanceIds.has(performance.id);

            if (isEditing) {
              return (
                <li className="bg-violet-50/40 px-5 py-3" key={performance.id}>
                  <PerformanceForm
                    concertId={concertId}
                    initialValues={toPerformanceFormValues(performance)}
                    onCancel={() => handleEditCancel(performance.id)}
                    onSaved={refetch}
                    onSuccess={() => handleEditCancel(performance.id)}
                    performanceId={performance.id}
                    submitLabel="저장"
                  />
                </li>
              );
            }

            let bookingOpensAtLabel = "미설정";

            if (performance.bookingOpensAt) {
              bookingOpensAtLabel = new Date(performance.bookingOpensAt).toLocaleString();
            }

            return (
              <li className="flex items-center justify-between gap-4 px-5 py-4" key={performance.id}>
                <div>
                  <p className="text-sm font-semibold text-slate-700">{new Date(performance.startsAt).toLocaleString()}</p>
                  <p className="mt-1 text-xs text-slate-400">예매 시작 · {bookingOpensAtLabel}</p>
                </div>

                <div className="flex shrink-0 gap-1">
                  <button
                    aria-label="공연 회차 수정"
                    className="inline-flex size-8 items-center justify-center rounded-md text-slate-500 hover:bg-violet-50 hover:text-violet-700 disabled:opacity-50"
                    disabled={isDeleting}
                    onClick={() => handleEditOpen(performance.id)}
                    type="button"
                  >
                    <Pencil aria-hidden className="size-4" />
                  </button>

                  <button
                    aria-label="공연 회차 삭제"
                    className="inline-flex size-8 items-center justify-center rounded-md text-slate-500 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                    disabled={isDeleting}
                    onClick={() => handleDelete(performance.id)}
                    type="button"
                  >
                    <Trash2 aria-hidden className="size-4" />
                  </button>
                </div>
              </li>
            );
          })}

          {isCreateOpen && (
            <li className="bg-violet-50/40 px-5 py-3">
              <PerformanceForm
                concertId={concertId}
                onCancel={handleCreateClose}
                onSaved={refetch}
                onSuccess={handleCreateClose}
                submitLabel="등록"
              />
            </li>
          )}
        </ul>

        {!isCreateOpen && (
          <div className="border-t border-slate-100 p-3">
            <button
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-violet-300 bg-violet-50 px-3 py-2.5 text-sm font-semibold text-violet-700"
              onClick={handleCreateOpen}
              type="button"
            >
              <Plus aria-hidden className="size-4" />
              공연 회차 추가
            </button>
          </div>
        )}
      </section>
    </div>
  );
};

export default PerformanceNewPage;
