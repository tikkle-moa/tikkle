import { Info } from "lucide-react";

import type { PerformanceResponse, SeatResponse } from "@entities/performance";

interface PerformanceSeatMapProps {
  performance: PerformanceResponse;
  seats: SeatResponse[];
}

const PerformanceSeatMap = ({ performance, seats }: PerformanceSeatMapProps) => {
  return (
    <section className="mt-6 w-full">
      <div className="w-full overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-100 px-4 py-4 sm:px-6">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-gray-900">좌석 배치 정보</h2>
            </div>
            <p className="mt-1 text-xs text-gray-500">
              {performance.name} · 전체 {seats.length}석
            </p>
          </div>
        </div>

        <div className="px-3 py-5 sm:px-8 sm:py-7">
          <div className="mx-auto max-w-2xl">
            <div className="relative aspect-4/3 overflow-hidden rounded-xl bg-linear-to-b from-violet-50/70 via-white to-sky-50/70 ring-1 ring-gray-100">
              <div className="absolute top-[5%] left-1/2 h-[13%] w-[72%] -translate-x-1/2 rounded-t-[50%] border-t-4 border-violet-300 bg-linear-to-b from-violet-100 to-transparent text-center text-[9px] font-bold tracking-[0.3em] text-violet-500 sm:text-xs">
                STAGE
              </div>
            </div>

            <div className="mt-6 flex items-start justify-center gap-2 border-t border-dashed border-gray-200 pt-4 text-xs text-gray-400">
              <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden />
              <p>좌석 상태와 선택 기능은 추후 적용 예정입니다.</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default PerformanceSeatMap;
