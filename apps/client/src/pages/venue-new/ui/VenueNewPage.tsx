import { Plus } from "lucide-react";

import { VenueForm } from "@features/venue-form";
import { VenueManageIntro } from "@features/venue-manage";

import { useVenueNew } from "../model/use-venue-new";

const VenueNewPage = () => {
  const { submitState, handleSubmit, handleCancel } = useVenueNew();

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 sm:gap-8">
      <VenueManageIntro title="공연장 등록" description="공연장 구조와 관객이 선택할 좌석 정보를 등록합니다." Icon={Plus} />

      <VenueForm mode="create" submitState={submitState} onSubmit={handleSubmit} onCancel={handleCancel} />
    </div>
  );
};

export default VenueNewPage;
