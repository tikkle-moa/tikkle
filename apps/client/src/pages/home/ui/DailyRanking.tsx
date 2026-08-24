import SectionTitle from "@shared/ui/SectionTitle";

import { BOOKING_STATUS_MAP, ConcertCard, ConcertCardSkeleton, getBookingStatus, getPeriod, useDailyRankings } from "@entities/concert";

import { DAILY_RANKINGS_SKELETON_COUNT } from "../model/home.constants";

const DailyRanking = () => {
  const { data: dailyRankings = [], isPending, isError } = useDailyRankings();

  return (
    <>
      {/* 대상 페이지 미구현으로 임시 빈 함수를 전달합니다. 추후 onClickMore 연결 필요 */}
      <SectionTitle title="일간 랭킹" onClickMore={() => {}} />

      {isPending && (
        <div className="divide-y divide-gray-100 overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
          {Array.from({ length: DAILY_RANKINGS_SKELETON_COUNT }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-4 py-3.5">
              <div className="h-5 w-6 animate-pulse rounded bg-gray-200" />
              <ConcertCardSkeleton className="w-12 shrink-0" effectOptions={{ ratio: "1/1" }} />
              <div className="flex flex-1 flex-col gap-2">
                <div className="h-3.5 w-3/5 animate-pulse rounded bg-gray-200" />
                <div className="h-3 w-2/5 animate-pulse rounded bg-gray-200" />
              </div>
            </div>
          ))}
        </div>
      )}

      {isError && <p className="text-sm text-gray-400">랭킹 정보를 불러오지 못했습니다.</p>}

      {!isPending && !isError && dailyRankings.length === 0 && <p className="text-sm text-gray-400">랭킹 데이터가 없습니다.</p>}

      {!isPending && !isError && dailyRankings.length > 0 && (
        <div className="divide-y divide-gray-100 overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
          {dailyRankings.map(({ concert, performances }, index) => {
            const rank = index + 1;
            const { label: statusLabel, className: statusClassName } = BOOKING_STATUS_MAP[getBookingStatus(performances)];
            const period = getPeriod(performances);

            return (
              <article key={concert.id} className="flex cursor-pointer items-center gap-4 px-4 py-3.5 transition-colors hover:bg-gray-50">
                <span className={`w-6 shrink-0 text-center text-base font-extrabold ${rank <= 3 ? "text-violet-600" : "text-gray-400"}`}>{rank}</span>

                <ConcertCard
                  concert={concert}
                  performances={performances}
                  className="w-12 shrink-0"
                  effectOptions={{ disableTilt: true, disableScale: true, disableGlare: true, disableShadow: true, ratio: "1/1" }}
                />

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <h3 className="truncate text-sm font-semibold text-gray-900">{concert.title}</h3>

                    <span className={`shrink-0 rounded-md px-1.5 py-0.5 text-xs font-bold ${statusClassName}`}>{statusLabel}</span>
                  </div>

                  <p className="mt-0.5 truncate text-xs text-gray-400">
                    {concert.placeName}
                    {period && ` · ${period}`}
                  </p>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </>
  );
};

export default DailyRanking;
