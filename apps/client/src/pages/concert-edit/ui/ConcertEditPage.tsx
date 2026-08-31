import { AlertTriangle, ArrowLeft, LoaderCircle, PencilLine } from "lucide-react";

import { ConcertForm } from "@features/concert-form";
import { ConcertManageIntro } from "@features/concert-manage";

import { useConcertEdit } from "../model/use-concert-edit";

const ConcertEditPage = () => {
  const { loadState, submitState, handleSubmit, handleCancel } = useConcertEdit();

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 sm:gap-8">
      <ConcertManageIntro title="콘서트 수정" description="등록된 콘서트의 기본 정보와 포스터를 수정해 주세요." Icon={PencilLine} />

      {loadState.status === "loading" && (
        <section
          className="flex min-h-72 flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white px-6 py-16 text-center shadow-sm"
          aria-live="polite"
          aria-busy="true"
        >
          <div className="bg-brand-primary/10 text-brand-primary flex size-14 items-center justify-center rounded-2xl">
            <LoaderCircle className="size-7 animate-spin" aria-hidden />
          </div>
          <h2 className="mt-5 text-base font-bold text-slate-900">콘서트 정보를 불러오고 있어요</h2>
          <p className="mt-2 text-sm text-slate-500">수정할 정보를 준비하는 동안 잠시만 기다려 주세요.</p>
        </section>
      )}

      {loadState.status === "error" && (
        <section
          className="flex min-h-72 flex-col items-center justify-center rounded-2xl border border-red-100 bg-white px-6 py-16 text-center shadow-sm"
          role="alert"
        >
          <div className="flex size-14 items-center justify-center rounded-2xl bg-red-50 text-red-500">
            <AlertTriangle className="size-7" aria-hidden />
          </div>
          <h2 className="mt-5 text-lg font-bold text-slate-900">콘서트 정보를 표시할 수 없어요</h2>
          <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">{loadState.error}</p>
          <button
            className="mt-6 inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500"
            type="button"
            onClick={handleCancel}
          >
            <ArrowLeft className="size-4" aria-hidden />
            콘서트 목록으로 돌아가기
          </button>
        </section>
      )}

      {loadState.status === "success" && (
        <ConcertForm
          mode="edit"
          initialValues={loadState.data}
          initialVenueName={loadState.data.venueName}
          submitState={submitState}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
        />
      )}
    </div>
  );
};

export default ConcertEditPage;
