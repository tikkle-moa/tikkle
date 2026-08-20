import { ConcertForm } from "@features/concert-form";

import { useConcertNew } from "../model/use-concert-new";

const ConcertNewPage = () => {
  const { isSubmitting, submitError, handleSubmit, handleCancel } = useConcertNew();

  return (
    <div className="flex flex-col gap-8">
      <div className="border-b border-slate-200 pb-6">
        <div className="flex flex-col gap-1">
          <span className="text-brand-primary text-sm font-semibold">콘서트 관리</span>

          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">콘서트 등록</h1>

          <p className="mt-1 text-sm leading-6 text-slate-500">새로운 콘서트의 기본 정보와 포스터를 등록해 주세요.</p>
        </div>
      </div>

      <ConcertForm mode="create" isSubmitting={isSubmitting} submitError={submitError} onSubmit={handleSubmit} onCancel={handleCancel} />
    </div>
  );
};

export default ConcertNewPage;
