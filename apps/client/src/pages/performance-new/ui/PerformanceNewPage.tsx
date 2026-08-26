import { AlertTriangle, CalendarPlus, LoaderCircle } from "lucide-react";

import { useConcertDetail } from "@entities/concert";

import { ConcertManageIntro } from "@features/concert-manage";
import { PerformanceForm } from "@features/performance-form";

import { usePerformanceNew } from "../model/use-performance-new";

const PerformanceNewPage = () => {
  const { concertId, isParamValid, handleComplete } = usePerformanceNew();
  const { data, isError, isPending, refetch } = useConcertDetail(concertId);

  if (!isParamValid) {
    return (
      <section
        className="mx-auto flex min-h-72 w-full max-w-4xl flex-col items-center justify-center rounded-2xl border border-red-100 bg-white px-6 py-16 text-center shadow-sm"
        role="alert"
      >
        <AlertTriangle className="size-7 text-red-500" aria-hidden />
        <h1 className="mt-4 text-lg font-bold text-slate-900">잘못된 콘서트입니다.</h1>
        <p className="mt-2 text-sm text-slate-500">올바른 콘서트에서 공연 회차를 등록해 주세요.</p>
      </section>
    );
  }

  if (isPending) {
    return (
      <section
        className="mx-auto flex min-h-72 w-full max-w-4xl items-center justify-center rounded-2xl border border-slate-200 bg-white"
        aria-busy="true"
      >
        <LoaderCircle className="text-brand-primary size-7 animate-spin" aria-hidden />
      </section>
    );
  }

  if (isError || !data) {
    return (
      <section
        className="mx-auto flex min-h-72 w-full max-w-4xl flex-col items-center justify-center rounded-2xl border border-red-100 bg-white px-6 py-16 text-center shadow-sm"
        role="alert"
      >
        <AlertTriangle className="size-7 text-red-500" aria-hidden />
        <h1 className="mt-4 text-lg font-bold text-slate-900">콘서트 정보를 불러오지 못했습니다.</h1>
        <p className="mt-2 text-sm text-slate-500">잠시 후 다시 시도해 주세요.</p>
      </section>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 sm:gap-8">
      <ConcertManageIntro
        title="공연 회차 등록"
        description="여러 회차를 연속으로 추가하고, 등록한 회차를 바로 수정하거나 삭제할 수 있습니다."
        Icon={CalendarPlus}
      />

      <PerformanceForm concertId={concertId} defaultCreateOpen onChanged={refetch} onComplete={handleComplete} performances={data.performances} />
    </div>
  );
};

export default PerformanceNewPage;
