import { Plus } from "lucide-react";

import { VenueForm } from "@features/venue-form";

import { useVenueNew } from "../model/use-venue-new";

const VenueNewPage = () => {
  const { submitState, handleSubmit, handleCancel } = useVenueNew();

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 sm:gap-8">
      <div className="rounded-2xl bg-linear-to-r from-violet-600 to-fuchsia-500 p-6 text-white shadow-sm sm:p-8">
        <div className="flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-xl bg-white/15">
            <Plus className="size-6" aria-hidden />
          </div>
          <div>
            <h1 className="text-xl font-bold sm:text-2xl">공연장 등록</h1>
            <p className="mt-1 text-sm text-violet-100">공연장 구조와 관객이 선택할 좌석 정보를 등록합니다.</p>
          </div>
        </div>
      </div>
      <VenueForm mode="create" submitState={submitState} onSubmit={handleSubmit} onCancel={handleCancel} />
    </div>
  );
};

export default VenueNewPage;
