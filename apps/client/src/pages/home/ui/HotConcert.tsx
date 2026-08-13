import SectionTitle from "@shared/ui/SectionTitle";

import { useHotConcerts } from "@entities/concert";

import { ConcertCard } from "@features/concert";

const HotConcert = () => {
  const { data: hotConcerts = [] } = useHotConcerts();
  return (
    <>
      {/* 대상 페이지 미구현으로 임시 빈 함수를 전달합니다. 추후 onClickMore 연결 필요 */}
      <SectionTitle title="지금 HOT한 공연" onClickMore={() => {}} />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {hotConcerts.map((concert) => (
          <ConcertCard
            key={concert.id}
            concert={concert}
            ratio={"4/3"}
            maxTilt={3}
            displayOptions={{ showStatus: true, showGenre: true, showTitle: true, showPeriod: true }}
          />
        ))}
      </div>
    </>
  );
};

export default HotConcert;
