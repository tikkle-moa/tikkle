import SectionTitle from "@shared/ui/SectionTitle";

import { ConcertCard, ConcertCardSkeleton, useUpcomingConcerts } from "@entities/concert";

import { UPCOMING_SKELETON_COUNT } from "../model/home.constants";

const UpcomingConcert = () => {
  const { data: upcomingConcerts = [], isPending, isError } = useUpcomingConcerts();

  return (
    <>
      {/* 대상 페이지 미구현으로 임시 빈 함수를 전달합니다. 추후 onClickMore 연결 필요 */}
      <SectionTitle title="오픈 예정" onClickMore={() => {}} />

      <div data-testid="upcoming-concert-scroll" className="scrollbar-thumb-rounded flex scrollbar-thumb-gray-400 gap-3 overflow-x-auto py-3">
        {isPending &&
          Array.from({ length: UPCOMING_SKELETON_COUNT }).map((_, i) => (
            <ConcertCardSkeleton
              key={i}
              className="w-40 shrink-0 md:w-60"
              displayOptions={{ showGenre: true, showTitle: true, showPlaceName: true }}
            />
          ))}

        {isError && <p className="text-sm text-gray-400">공연 정보를 불러오지 못했습니다.</p>}

        {!isPending && !isError && upcomingConcerts.length === 0 && <p className="text-sm text-gray-400">오픈 예정 공연이 없습니다.</p>}

        {!isPending &&
          !isError &&
          upcomingConcerts.map((concert) => (
            <ConcertCard
              key={concert.id}
              concert={concert}
              status="upcoming"
              className="w-40 shrink-0 md:w-60"
              displayOptions={{ showGenre: true, showTitle: true, showPlaceName: true }}
            />
          ))}
      </div>
    </>
  );
};

export default UpcomingConcert;
