import { useRef, useState } from "react";

import type { Swiper as SwiperType } from "swiper";

export const useContentSlider = () => {
  const swiperRef = useRef<SwiperType | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);

  const handleToggleAutoplay = () => {
    const swiper = swiperRef.current;

    if (!swiper) return;

    if (isPlaying) {
      swiper.autoplay.stop();
    } else {
      swiper.autoplay.start();
    }

    setIsPlaying((prev) => !prev);
  };

  return {
    swiperRef,
    currentIndex,
    setCurrentIndex,
    isPlaying,
    handleToggleAutoplay,
  };
};
