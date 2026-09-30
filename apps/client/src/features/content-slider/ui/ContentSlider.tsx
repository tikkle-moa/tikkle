import { type ReactNode } from "react";

import { ChevronLeft, ChevronRight, Pause, Play } from "lucide-react";
import "swiper/css";
import { Autoplay } from "swiper/modules";
import { Swiper, SwiperSlide } from "swiper/react";

import { useContentSlider } from "../model/use-content-slider";

interface ContentSliderProps {
  items: ReactNode[];
}

const ContentSlider = ({ items }: ContentSliderProps) => {
  const { swiperRef, currentIndex, setCurrentIndex, isPlaying, handleToggleAutoplay } = useContentSlider();

  return (
    <div className="relative" data-testid="content-slider">
      <Swiper
        modules={[Autoplay]}
        onSwiper={(swiper) => {
          swiperRef.current = swiper;
        }}
        onSlideChange={(swiper) => {
          setCurrentIndex(swiper.realIndex);
        }}
        autoplay={{
          delay: 3000,
          disableOnInteraction: false,
        }}
        loop
        centeredSlides
        slidesPerView={1}
        spaceBetween={20}
      >
        {items.map((item, index) => (
          <SwiperSlide key={index} className="aspect-16/10 overflow-hidden rounded-xl sm:aspect-16/7 sm:rounded-2xl lg:aspect-16/6">
            {item}
          </SwiperSlide>
        ))}
      </Swiper>

      <button
        type="button"
        data-testid="prev-slide-button"
        aria-label="이전 슬라이드"
        onClick={() => swiperRef.current?.slidePrev()}
        className="absolute top-1/2 left-2 z-10 -translate-y-1/2 rounded-2xl bg-white p-1 shadow hover:bg-gray-300 sm:left-6 sm:p-2"
      >
        <ChevronLeft className="h-4 w-4 sm:h-6 sm:w-6" />
      </button>

      <button
        type="button"
        data-testid="next-slide-button"
        aria-label="다음 슬라이드"
        onClick={() => swiperRef.current?.slideNext()}
        className="absolute top-1/2 right-2 z-10 -translate-y-1/2 rounded-2xl bg-white p-1 shadow hover:bg-gray-300 sm:right-6 sm:p-2"
      >
        <ChevronRight className="h-4 w-4 sm:h-6 sm:w-6" />
      </button>

      <div className="absolute right-3 bottom-2 z-10 flex items-center gap-2 rounded-full bg-black/60 px-3 py-1 text-xs text-white sm:right-10 sm:bottom-4 sm:text-sm">
        <span data-testid="slide-indicator">
          {String(currentIndex + 1).padStart(2, "0")} / {String(items.length).padStart(2, "0")}
        </span>

        <button
          type="button"
          data-testid="autoplay-button"
          aria-label={isPlaying ? "자동 재생 일시정지" : "자동 재생 시작"}
          onClick={handleToggleAutoplay}
        >
          {isPlaying ? <Pause className="h-3 w-3 sm:h-4 sm:w-4" /> : <Play className="h-3 w-3 sm:h-4 sm:w-4" />}
        </button>
      </div>
    </div>
  );
};

export default ContentSlider;
