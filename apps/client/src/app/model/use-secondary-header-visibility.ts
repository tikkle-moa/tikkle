import { useCallback, useEffect, useRef, useState } from "react";

export const useSecondaryHeaderVisibility = () => {
  const scrollContainerRef = useRef<HTMLElement>(null);
  const [heroElement, setHeroElement] = useState<HTMLDivElement | null>(null);
  const [isHeroVisible, setIsHeroVisible] = useState(true);

  const heroRef = useCallback((element: HTMLDivElement | null) => {
    setHeroElement(element);
  }, []);

  useEffect(() => {
    const scrollContainer = scrollContainerRef.current;

    if (!heroElement || !scrollContainer) {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        const isVisible = entry.boundingClientRect.bottom > (entry.rootBounds?.top ?? 0);

        setIsHeroVisible(isVisible);
      },
      {
        root: scrollContainer,
        threshold: 0,
      },
    );

    observer.observe(heroElement);

    return () => {
      observer.disconnect();
    };
  }, [heroElement]);

  return {
    heroRef,
    isSecondaryHeaderVisible: heroElement === null || isHeroVisible,
    scrollContainerRef,
  };
};
