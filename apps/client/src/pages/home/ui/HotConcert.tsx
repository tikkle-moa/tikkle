import { Link, generatePath } from "react-router";

import { ROUTE_PATHS } from "@shared/config/router.config";
import SectionTitle from "@shared/ui/SectionTitle";

import { ConcertCard, ConcertCardSkeleton, useHotConcerts } from "@entities/concert";

import { HOT_MAXIMUM_COUNT } from "../model/home.constants";

const HotConcert = () => {
  const { data: hotConcerts = [], isPending, isError } = useHotConcerts();

  return (
    <>
      {/* 대상 페이지 미구현으로 임시 빈 함수를 전달합니다. 추후 onClickMore 연결 필요 */}
      <SectionTitle title="지금 HOT한 공연" onClickMore={() => {}} />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {isPending &&
          Array.from({ length: HOT_MAXIMUM_COUNT }).map((_, i) => (
            <ConcertCardSkeleton key={i} displayOptions={{ showGenre: true, showTitle: true }} effectOptions={{ ratio: "4/3" }} />
          ))}
      </div>

      {isError && <p className="text-sm text-gray-400">공연 정보를 불러오지 못했습니다.</p>}

      {!isPending && !isError && hotConcerts.length === 0 && <p className="text-sm text-gray-400">HOT한 공연이 없습니다.</p>}

      {!isPending && !isError && hotConcerts.length > 0 && (
        <div data-testid="hot-concert-grid" className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {hotConcerts.slice(0, HOT_MAXIMUM_COUNT).map((concert) => (
            <Link
              key={concert.id}
              aria-label={`${concert.title} 상세 보기`}
              className="block"
              to={generatePath(ROUTE_PATHS.CONCERT_DETAIL, {
                concertId: String(concert.id),
              })}
            >
              <ConcertCard
                key={concert.id}
                concert={concert}
                displayOptions={{ showGenre: true, showTitle: true }}
                effectOptions={{ maxTilt: 3, ratio: "4/3" }}
              />
            </Link>
          ))}
        </div>
      )}
    </>
  );
};

export default HotConcert;
