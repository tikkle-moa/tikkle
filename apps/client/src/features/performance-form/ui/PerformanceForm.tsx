import { Pencil, Plus, Trash2 } from "lucide-react";

import type { PerformanceResponse } from "@entities/performance";

import PerformanceFormEditor from "./PerformanceFormEditor";

import { toPerformanceFormValues } from "../model/performance-form.utils";
import { usePerformanceForm } from "../model/use-performance-form";

interface PerformanceFormProps {
  concertId: number;
  performances: PerformanceResponse[];
  defaultCreateOpen?: boolean;
  onChanged: () => Promise<unknown>;
  onComplete?: () => void;
}

const PerformanceForm = ({ concertId, performances, defaultCreateOpen = false, onChanged, onComplete }: PerformanceFormProps) => {
  const { editing, submitState, deletingId, handleCreate, handleEdit, handleCancel, handleSubmit, handleDelete } = usePerformanceForm({
    concertId,
    defaultCreateOpen,
    onChanged,
  });

  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <header className="flex items-center justify-between gap-4 border-b border-slate-100 px-5 py-4">
        <div>
          <h2 className="text-base font-bold text-slate-900">공연 회차</h2>
          <p className="mt-1 text-xs text-slate-400">총 {performances.length}개의 공연 일정</p>
        </div>

        {onComplete && (
          <button className="bg-brand-primary rounded-lg px-3 py-2 text-sm font-semibold text-white" onClick={onComplete} type="button">
            완료
          </button>
        )}
      </header>

      <ul className="divide-y divide-slate-100">
        {performances.map((performance) =>
          editing?.mode === "edit" && editing.performance.id === performance.id ? (
            <li className="bg-violet-50/40 px-5 py-3" key={performance.id}>
              <PerformanceFormEditor
                initialValues={toPerformanceFormValues(performance)}
                onCancel={handleCancel}
                onSubmit={handleSubmit}
                submitLabel="저장"
                submitState={submitState}
              />
            </li>
          ) : (
            <li className="flex items-center justify-between gap-4 px-5 py-4" key={performance.id}>
              <div>
                <p className="text-sm font-semibold text-slate-700">{new Date(performance.startsAt).toLocaleString()}</p>
                <p className="mt-1 text-xs text-slate-400">
                  예매 시작 · {performance.bookingOpensAt ? new Date(performance.bookingOpensAt).toLocaleString() : "미설정"}
                </p>
              </div>

              <div className="flex shrink-0 gap-1">
                <button
                  aria-label="공연 회차 수정"
                  className="inline-flex size-8 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-violet-700"
                  disabled={deletingId === performance.id}
                  onClick={() => handleEdit(performance)}
                  type="button"
                >
                  <Pencil className="size-4" aria-hidden />
                </button>

                <button
                  aria-label="공연 회차 삭제"
                  className="inline-flex size-8 items-center justify-center rounded-md text-slate-500 hover:bg-red-50 hover:text-red-600"
                  disabled={deletingId === performance.id}
                  onClick={() => handleDelete(performance)}
                  type="button"
                >
                  <Trash2 className="size-4" aria-hidden />
                </button>
              </div>
            </li>
          ),
        )}

        {editing?.mode === "create" && (
          <li className="bg-violet-50/40 px-5 py-3">
            <PerformanceFormEditor key={editing.key} onCancel={handleCancel} onSubmit={handleSubmit} submitLabel="등록" submitState={submitState} />
          </li>
        )}
      </ul>

      {!editing && (
        <div className="border-t border-slate-100 p-3">
          <button
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-violet-300 bg-violet-50 px-3 py-2.5 text-sm font-semibold text-violet-700"
            onClick={handleCreate}
            type="button"
          >
            <Plus className="size-4" aria-hidden />
            공연 회차 추가
          </button>
        </div>
      )}
    </section>
  );
};

export default PerformanceForm;
