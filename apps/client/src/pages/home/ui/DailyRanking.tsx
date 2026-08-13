import SectionTitle from "@shared/ui/SectionTitle";

import { BOOKING_STATUS_MAP, getBookingStatus, getPeriod, useDailyRankings } from "@entities/concert";

import { ConcertCard } from "@features/concert";

const DailyRanking = () => {
  const { data: dailyRankings = [] } = useDailyRankings();

  return (
    <>
      {/* 대상 페이지 미구현으로 임시 빈 함수를 전달합니다. 추후 onClickMore 연결 필요 */}
      <SectionTitle title="일간 랭킹" onClickMore={() => {}} />

      <div className="divide-y divide-gray-100 overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
        {dailyRankings.map((concert, index) => {
          const rank = index + 1;
          const { label: statusLabel, className: statusClassName } = BOOKING_STATUS_MAP[getBookingStatus(concert)];
          const period = getPeriod(concert.performances);

          return (
            <article key={concert.id} className="flex cursor-pointer items-center gap-4 px-4 py-3.5 transition-colors hover:bg-gray-50">
              <span className={`w-6 shrink-0 text-center text-base font-extrabold ${rank <= 3 ? "text-violet-600" : "text-gray-400"}`}>{rank}</span>

              <ConcertCard concert={concert} ratio="1/1" className="w-12 shrink-0" disableTilt disableScale disableGlare disableShadow />

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
    </>
  );
};

export default DailyRanking;
