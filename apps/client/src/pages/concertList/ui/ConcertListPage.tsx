import { useConcerts } from "@entities/concert";

import { ConcertCard, ConcertCardSkeleton } from "@features/concert";

import ConcertListFilterPanel from "./ConcertListFilterPanel";

import { CONCERT_LIST_SKELETON_COUNT } from "../model/concert-list.constants";

const ConcertListPage = () => {
  const { data: concerts = [], isPending, isError } = useConcerts();

  return (
    <section className="mx-auto max-w-6xl">
      <h1 className="mb-6 text-lg font-bold text-gray-900 sm:text-xl">공연 목록</h1>

      <div className="flex items-start gap-8">
        <ConcertListFilterPanel />

        <div className="min-w-0 flex-1">
          {isPending && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {Array.from({ length: CONCERT_LIST_SKELETON_COUNT }).map((_, index) => (
                <ConcertCardSkeleton
                  key={index}
                  displayOptions={{
                    showTitle: true,
                    showPlaceName: true,
                    showPeriod: true,
                  }}
                />
              ))}
            </div>
          )}

          {isError && <p className="text-sm text-gray-400">공연 정보를 불러오지 못했습니다.</p>}

          {!isPending && !isError && concerts.length === 0 && <p className="text-sm text-gray-400">등록된 공연이 없습니다.</p>}

          {!isPending && !isError && concerts.length > 0 && (
            <div data-testid="concert-list-grid" className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {concerts.map((concert) => (
                <ConcertCard
                  key={concert.id}
                  concert={concert}
                  displayOptions={{
                    showStatus: true,
                    showGenre: true,
                    showTitle: true,
                    showPlaceName: true,
                    showPeriod: true,
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default ConcertListPage;
