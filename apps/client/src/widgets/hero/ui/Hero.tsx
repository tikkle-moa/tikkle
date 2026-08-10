import { Link } from "react-router";

import { ROUTE_PATHS } from "@shared/config/router.config";

import { CONCERT_CATEGORY_MAP } from "@entities/concert";

import { ContentSlider } from "@features/content-slider";

import HeroBanner from "./HeroBanner";

const Hero = () => (
  <div className="flex flex-col gap-6">
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
        <Link to={ROUTE_PATHS.CONCERTS} className="hover:text-brand-primary flex flex-col items-center gap-2 text-gray-600 transition">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-gray-50 text-2xl transition hover:bg-violet-50">🎵</div>
          <span className="text-xs font-medium whitespace-nowrap">전체</span>
        </Link>

        {Object.values(CONCERT_CATEGORY_MAP).map(({ emoji, label, to }) => (
          <Link key={label} to={to} className="hover:text-brand-primary flex flex-col items-center gap-2 text-gray-600 transition">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-gray-50 text-2xl transition hover:bg-violet-50">{emoji}</div>
            <span className="text-xs font-medium whitespace-nowrap">{label}</span>
          </Link>
        ))}
      </div>
    </div>
  </div>
);

export default Hero;
