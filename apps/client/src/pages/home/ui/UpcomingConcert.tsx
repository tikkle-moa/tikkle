import SectionTitle from "@shared/ui/SectionTitle";

import { CARD_COLORS, UPCOMING_CONCERTS } from "../model/dummy-data.constants";

const UpcomingConcert = () => {
  return (
    <>
      <SectionTitle title="오픈 예정" subtitle="지금 바로 알림 설정하세요" onClickMore={() => {}} />

      <div className="flex gap-3 overflow-x-auto pb-2 [&::-webkit-scrollbar]:hidden">
        {UPCOMING_CONCERTS.map(({ id, title, venue, openDate, badge }) => (
          <article key={id} className="w-44 shrink-0 cursor-pointer sm:w-52">
            <div
              className="relative mb-2 aspect-3/4 overflow-hidden rounded-xl"
              style={{
                backgroundColor: CARD_COLORS[id % CARD_COLORS.length] + "33",
              }}
            >
              {badge && (
                <span className="bg-brand-primary absolute top-2 left-2 rounded-md px-1.5 py-0.5 text-xs font-semibold text-white">{badge}</span>
              )}

              <div className="absolute inset-0 flex items-center justify-center text-4xl opacity-20">🎫</div>
            </div>

            <h3 className="truncate text-sm font-semibold text-gray-900">{title}</h3>
            <p className="mt-0.5 truncate text-xs text-gray-400">{venue}</p>
            <p className="text-brand-primary mt-1 text-xs font-medium">오픈 {openDate}</p>
          </article>
        ))}
      </div>
    </>
  );
};

export default UpcomingConcert;
