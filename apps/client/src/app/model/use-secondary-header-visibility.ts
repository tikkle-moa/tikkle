import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation } from "react-router";

import { ROUTE_PATHS } from "@shared/config/router.config";

export const useSecondaryHeaderVisibility = () => {
  const { pathname } = useLocation();
  const isHome = pathname === ROUTE_PATHS.HOME;

  const scrollContainerRef = useRef<HTMLElement>(null);
  const [categoryElement, setCategoryElement] = useState<HTMLDivElement | null>(null);
  const [isSecondaryHeaderVisible, setIsSecondaryHeaderVisible] = useState(true);

  const categoryRef = useCallback((element: HTMLDivElement | null) => {
    setCategoryElement(element);
  }, []);

  useEffect(() => {
    const scrollContainer = scrollContainerRef.current;

    if (!isHome || !categoryElement || !scrollContainer) {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        const isVisible = entry.boundingClientRect.bottom > (entry.rootBounds?.top ?? 0);

        setIsSecondaryHeaderVisible((previous) => (previous === isVisible ? previous : isVisible));
      },
      {
        root: scrollContainer,
        threshold: 0,
      },
    );

    observer.observe(categoryElement);

    return () => {
      observer.disconnect();
    };
  }, [categoryElement, isHome]);

  return {
    categoryRef,
    isSecondaryHeaderVisible: !isHome || isSecondaryHeaderVisible,
    scrollContainerRef,
  };
};
