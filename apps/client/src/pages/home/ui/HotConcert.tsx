import SectionTitle from "@shared/ui/SectionTitle";

import { CARD_COLORS, HOT_CONCERTS } from "../model/dummy-data.constants";

const HotConcert = () => {
  return (
    <>
      {/* 대상 페이지 미구현으로 임시 빈 함수를 전달합니다. 추후 onClickMore 연결 필요 */}
      <SectionTitle title="지금 HOT한 공연" subtitle="놓치면 후회하는 이번 달 공연" onClickMore={() => {}} />

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {HOT_CONCERTS.map(({ id, title, genre, period }) => (
          <article key={id} className="cursor-pointer">
            <div
              className="relative mb-2 aspect-4/3 overflow-hidden rounded-xl"
              style={{
                backgroundColor: CARD_COLORS[id % CARD_COLORS.length] + "22",
              }}
            >
              <span className="absolute top-2 left-2 rounded-md bg-white/80 px-1.5 py-0.5 text-xs font-medium text-gray-600 backdrop-blur-sm">
                {genre}
              </span>

              <div className="absolute inset-0 flex items-center justify-center text-3xl opacity-20">🎶</div>
            </div>

            <h3 className="truncate text-sm font-semibold text-gray-900">{title}</h3>
            <p className="mt-0.5 text-xs text-gray-400">{period}</p>
          </article>
        ))}
      </div>
    </>
  );
};

export default HotConcert;
