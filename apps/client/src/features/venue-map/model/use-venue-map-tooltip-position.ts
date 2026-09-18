import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

import { useCurrentTime } from "@shared/model/use-current-time";

import type { VenueSeatStatus } from "@entities/venue";

import type { TooltipPosition } from "./venue-map.types";
import { getSeatStatusMessage, getViewportAdjustedTooltipPosition } from "./venue-map.utils";

interface UseVenueMapTooltipPositionProps {
  status: VenueSeatStatus;
  expiresAt?: Date;
  serverTimeOffset: number;
  position: TooltipPosition;
}

export const useVenueMapTooltipPosition = ({ status, expiresAt, serverTimeOffset, position }: UseVenueMapTooltipPositionProps) => {
  const currentTime = useCurrentTime();
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [adjustedPosition, setAdjustedPosition] = useState<{ left: number; top: number } | null>(null);
  const updatePosition = useCallback(() => {
    const tooltipRect = tooltipRef.current!.getBoundingClientRect();
    const nextPosition = getViewportAdjustedTooltipPosition(
      position,
      { width: tooltipRect.width, height: tooltipRect.height },
      { left: window.scrollX, top: window.scrollY, width: window.innerWidth, height: window.innerHeight },
    );
    setAdjustedPosition((current) => (current?.left === nextPosition.left && current.top === nextPosition.top ? current : nextPosition));
  }, [position]);

  useLayoutEffect(updatePosition, [currentTime, updatePosition]);

  useEffect(() => {
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [updatePosition]);

  const seatStatusMessage = getSeatStatusMessage(status, expiresAt, currentTime, serverTimeOffset).description;

  return {
    tooltipRef,
    adjustedPosition,
    seatStatusMessage,
  };
};
