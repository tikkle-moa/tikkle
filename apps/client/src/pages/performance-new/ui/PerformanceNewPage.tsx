import { CalendarPlus } from "lucide-react";

import { ConcertManageIntro } from "@features/concert-manage";
import { PerformanceForm } from "@features/performance-form";

import ConcertDetailMessage from "@pages/concert-detail/ui/ConcertDetailMessage";

import { usePerformanceNew } from "../model/use-performance-new";

const PerformanceNewPage = () => {
  const { isParamValid, submitState, handleSubmit, handleCancel } = usePerformanceNew();

  if (!isParamValid) {
    return <ConcertDetailMessage title="잘못된 콘서트입니다." description="올바른 콘서트에서 공연 회차를 등록해 주세요." />;
  }

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 sm:gap-8">
      <ConcertManageIntro title="공연 회차 등록" description="공연 시작 시각과 예매 시작 시각을 등록해 주세요." Icon={CalendarPlus} />

      <PerformanceForm submitLabel="회차 등록" submitState={submitState} onSubmit={handleSubmit} onCancel={handleCancel} />
    </div>
  );
};

export default PerformanceNewPage;
