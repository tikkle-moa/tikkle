import SectionTitle from "@shared/ui/SectionTitle";

import { CARD_COLORS, DAILY_RANKINGS } from "../model/dummy-data.constants";

const DailyRanking = () => {
  return (
    <>
      <SectionTitle title="일간 랭킹" subtitle="오늘 가장 인기 있는 공연" onClickMore={() => {}} />

      <div className="divide-y divide-gray-100 overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
        {DAILY_RANKINGS.map(({ rank, title, venue, period }) => (
          <article key={rank} className="flex cursor-pointer items-center gap-4 px-4 py-3.5 transition hover:bg-gray-50">
            <span
              className="w-6 shrink-0 text-center text-base font-extrabold"
              style={{
                color: rank <= 3 ? "#7c3aed" : "#9ca3af",
              }}
            >
              {rank}
            </span>

            <div
              className="size-12 shrink-0 rounded-xl"
              style={{
                backgroundColor: CARD_COLORS[rank % CARD_COLORS.length] + "33",
              }}
            />

            <div className="min-w-0">
              <h3 className="truncate text-sm font-semibold text-gray-900">{title}</h3>
              <p className="mt-0.5 truncate text-xs text-gray-400">
                {venue} · {period}
              </p>
            </div>
          </article>
        ))}
      </div>
    </>
  );
};

export default DailyRanking;
