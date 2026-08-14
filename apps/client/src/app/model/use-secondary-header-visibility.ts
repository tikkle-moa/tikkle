import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation } from "react-router";

import { ROUTE_PATHS } from "@shared/config/router.config";

export const useSecondaryHeaderVisibility = () => {
  const { pathname } = useLocation();
  const isHome = pathname === ROUTE_PATHS.HOME;

  const scrollContainerRef = useRef<HTMLElement>(null);
  const [heroElement, setHeroElement] = useState<HTMLDivElement | null>(null);
  const [isHeroVisible, setIsHeroVisible] = useState(true);

  const heroRef = useCallback((element: HTMLDivElement | null) => {
    setHeroElement(element);
  }, []);

  useEffect(() => {
    const scrollContainer = scrollContainerRef.current;

    if (!isHome || !heroElement || !scrollContainer) {
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
  }, [heroElement, isHome]);

  return {
    heroRef,
    isSecondaryHeaderVisible: !isHome || isHeroVisible,
    scrollContainerRef,
  };
};
