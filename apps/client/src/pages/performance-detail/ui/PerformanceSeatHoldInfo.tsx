import { memo } from "react";

import { Clock3, Info, LockKeyhole, MousePointerClick } from "lucide-react";

const PerformanceSeatHoldInfo = () => {
  return (
    <section aria-label="좌석 점유 안내" className="rounded-xl border border-violet-100 bg-violet-50/50 p-3">
      <div className="mb-2.5 flex items-center gap-1.5">
        <Info className="size-4 text-violet-600" aria-hidden />
        <p className="text-xs font-bold text-slate-800">좌석 점유 안내</p>
      </div>

      <div className="space-y-1.5 text-xs leading-5 text-slate-600">
        <div className="flex items-start gap-2">
          <MousePointerClick className="mt-0.5 size-3.5 shrink-0 text-violet-500" aria-hidden />
          <p>선택한 좌석은 잠시 후 자동으로 점유됩니다.</p>
        </div>

        <div className="flex items-start gap-2">
          <Clock3 className="mt-0.5 size-3.5 shrink-0 text-violet-500" aria-hidden />
          <p>
            점유 시간은 <strong className="font-semibold text-slate-700">5분</strong>이며 연장할 수 없습니다.
          </p>
        </div>

        <div className="flex items-start gap-2">
          <LockKeyhole className="mt-0.5 size-3.5 shrink-0 text-violet-500" aria-hidden />
          <p>다른 그룹이 점유 중인 좌석은 만료 후 선택할 수 있습니다.</p>
        </div>
      </div>
    </section>
  );
};

export default memo(PerformanceSeatHoldInfo);
