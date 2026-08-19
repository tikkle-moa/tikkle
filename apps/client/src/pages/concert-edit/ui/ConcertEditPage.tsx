import { ConcertForm } from "@features/concert-form";

import { useConcertEdit } from "../model/use-concert-edit";

const ConcertEditPage = () => {
  const { isParamValid, initialValues, isSubmitting, submitError, handleSubmit, handleCancel } = useConcertEdit();

  if (!isParamValid) {
    return (
      <div className="flex flex-col gap-8">
        <div className="border-b border-slate-200 pb-6">
          <div className="flex flex-col gap-1">
            <span className="text-brand-primary text-sm font-semibold">콘서트 관리</span>

            <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">잘못된 콘서트</h1>

            <p className="mt-1 text-sm leading-6 text-slate-500">올바르지 않은 콘서트 ID입니다.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="border-b border-slate-200 pb-6">
        <div className="flex flex-col gap-1">
          <span className="text-brand-primary text-sm font-semibold">콘서트 관리</span>

          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">콘서트 수정</h1>

          <p className="mt-1 text-sm leading-6 text-slate-500">등록된 콘서트의 기본 정보와 포스터를 수정해 주세요.</p>
        </div>
      </div>

      <ConcertForm
        mode="edit"
        initialValues={initialValues ?? undefined}
        isSubmitting={isSubmitting}
        submitError={submitError}
        onSubmit={handleSubmit}
        onCancel={handleCancel}
      />
    </div>
  );
};

export default ConcertEditPage;
