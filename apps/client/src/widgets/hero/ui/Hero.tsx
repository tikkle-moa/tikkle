import type { RefCallback } from "react";

import { ListMusic } from "lucide-react";

import { ROUTE_PATHS } from "@shared/config/router.config";

import { CONCERT_GENRE_MAP } from "@entities/concert";

import { ContentSlider } from "@features/content-slider";

import ConcertGenreLink from "./ConcertGenreLink";
import HeroBanner from "./HeroBanner";

interface HeroProps {
  heroRef?: RefCallback<HTMLDivElement>;
}

const Hero = ({ heroRef }: HeroProps) => (
  <div ref={heroRef} data-testid="hero-content" className="flex flex-col gap-6">
    {/* 배너 데이터 미구현으로 임시 이미지를 사용합니다. 추후 실제 배너 데이터로 교체 필요 */}
    <ContentSlider
      items={[
        <HeroBanner />,
        <img key="1" src="https://picsum.photos/1600/600?random=1" className="h-full w-full object-cover" />,
        <img key="2" src="https://picsum.photos/1600/600?random=2" className="h-full w-full object-cover" />,
        <img key="3" src="https://picsum.photos/1600/600?random=3" className="h-full w-full object-cover" />,
      ]}
    />

    <div className="border-b border-gray-100">
      <div className="flex flex-wrap justify-center gap-6 px-4 py-3 md:gap-10 md:px-0">
        <ConcertGenreLink config={{ icon: ListMusic, label: "전체", className: "bg-gray-100 text-gray-600", to: ROUTE_PATHS.CONCERT_LIST }} />

        {Object.values(CONCERT_GENRE_MAP).map((config, idx) => (
          <ConcertGenreLink key={idx} config={config} />
        ))}
      </div>
    </div>
  </div>
);

export default Hero;
