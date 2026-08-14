import SectionTitle from "@shared/ui/SectionTitle";

import { useUpcomingConcerts } from "@entities/concert";

import { ConcertCard } from "@features/concert";

const UpcomingConcert = () => {
  const { data: upcomingConcerts = [] } = useUpcomingConcerts();

  return (
    <>
      {/* 대상 페이지 미구현으로 임시 빈 함수를 전달합니다. 추후 onClickMore 연결 필요 */}
      <SectionTitle title="오픈 예정" onClickMore={() => {}} />

      <div className="scrollbar-thumb-rounded flex scrollbar-thumb-gray-400 gap-3 overflow-x-auto py-3">
        {upcomingConcerts.map((concert) => (
          <ConcertCard
            key={concert.id}
            concert={concert}
            className="w-40 shrink-0 md:w-60"
            displayOptions={{ showGenre: true, showTitle: true, showPlaceName: true, showPeriod: true }}
          />
        ))}
      </div>
    </>
  );
};

export default UpcomingConcert;
