import { Plus } from "lucide-react";

import { ConcertForm } from "@features/concert-form";
import { ConcertManageIntro } from "@features/concert-manage";

import { useConcertNew } from "../model/use-concert-new";

const ConcertNewPage = () => {
  const { submitState, handleSubmit, handleCancel } = useConcertNew();

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 sm:gap-8">
      <ConcertManageIntro title="콘서트 등록" description="새로운 콘서트의 기본 정보와 포스터를 등록해 주세요." Icon={Plus} />

      <ConcertForm submitLabel="콘서트 등록" submitState={submitState} onSubmit={handleSubmit} onCancel={handleCancel} />
    </div>
  );
};

export default ConcertNewPage;
