import { formatTime } from "@shared/lib/date.utils";

import type { VenueSeatResponse, VenueSeatStatus } from "@entities/venue";

import { SECTION_COLOR_LIGHTNESS, SECTION_COLOR_SATURATION, TOOLTIP_GAP, TOOLTIP_VIEWPORT_PADDING } from "./venue-map.constants";
import type { TooltipPosition } from "./venue-map.types";

export const createVenueSeatLabelMap = (venueSeats: VenueSeatResponse[]) =>
  new Map(venueSeats.map((seat) => [seat.id, `${seat.seatLabel}, ${seat.price.toLocaleString()}원`]));

const createSectionColorSeed = (venueId: number, sectionName: string) => {
  let hash = 2_166_136_261;
  const value = `${venueId}:${sectionName}`;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16_777_619);
  }

  return hash >>> 0;
};

export const createSectionColorMap = (venueId: number, sectionNames: string[]) =>
  Object.fromEntries(
    sectionNames.map((sectionName) => {
      const hue = createSectionColorSeed(venueId, sectionName) % 360;

      return [sectionName, `hsl(${hue} ${SECTION_COLOR_SATURATION}% ${SECTION_COLOR_LIGHTNESS}%)`];
    }),
  ) as Record<string, string>;

const getRemainingHoldTime = (expiresAt?: Date, currentTime?: number, serverTimeOffset: number = 0) => {
  if (!expiresAt || currentTime === undefined || !Number.isFinite(expiresAt.getTime())) return null;

  const remainingSeconds = Math.ceil((expiresAt.getTime() - (currentTime + serverTimeOffset)) / 1000);
  if (remainingSeconds <= 0) return "곧 만료";

  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;
  return minutes > 0 ? `${minutes}분 ${seconds.toString().padStart(2, "0")}초 남음` : `${seconds}초 남음`;
};

export const getSeatStatusMessage = (status: VenueSeatStatus, expiresAt?: Date, currentTime?: number, serverTimeOffset: number = 0) => {
  const expiresAtText = expiresAt && Number.isFinite(expiresAt.getTime()) ? formatTime(expiresAt) : null;
  const remainingText = getRemainingHoldTime(expiresAt, currentTime, serverTimeOffset);
  const holdTimeText = [remainingText, expiresAtText ? `${expiresAtText}까지` : null].filter(Boolean).join(" · ");

  switch (status) {
    case "held_by_my_group":
      return {
        label: "내 Hold",
        description: holdTimeText ? `${holdTimeText} Hold 중입니다.` : "Hold 중인 좌석입니다.",
      };
    case "held_by_other_group":
      return {
        label: "다른 관람객 Hold",
        description: holdTimeText ? `${holdTimeText} 다른 관람객이 Hold 중입니다.` : "다른 관람객이 Hold 중인 좌석입니다.",
      };
    case "booked":
      return {
        label: "예약 완료",
        description: "예약이 완료된 좌석입니다.",
      };
    case "available":
      return {
        label: "선택 가능",
        description: "선택 가능한 좌석입니다.",
      };
  }
};

export const getViewportAdjustedTooltipPosition = (
  anchor: TooltipPosition,
  tooltipSize: { width: number; height: number },
  viewport: { left: number; top: number; width: number; height: number },
) => {
  const viewportRight = viewport.left + viewport.width - TOOLTIP_VIEWPORT_PADDING;
  const viewportBottom = viewport.top + viewport.height - TOOLTIP_VIEWPORT_PADDING;
  const minLeft = viewport.left + TOOLTIP_VIEWPORT_PADDING;
  const maxLeft = Math.max(minLeft, viewportRight - tooltipSize.width);
  const preferredLeft = anchor.left - tooltipSize.width / 2;
  const preferredTop = anchor.top - TOOLTIP_GAP - tooltipSize.height;
  const fallbackTop = anchor.bottom + TOOLTIP_GAP;
  const minTop = viewport.top + TOOLTIP_VIEWPORT_PADDING;
  const maxTop = Math.max(minTop, viewportBottom - tooltipSize.height);

  return {
    left: Math.min(Math.max(preferredLeft, minLeft), maxLeft),
    top:
      preferredTop >= minTop
        ? preferredTop
        : fallbackTop + tooltipSize.height <= viewportBottom
          ? fallbackTop
          : Math.min(Math.max(preferredTop, minTop), maxTop),
  };
};

export const isCurrentSeatSelectable = (element: SVGGElement) => {
  const currentStatus = element.dataset.seatStatus;
  return currentStatus === "available" || currentStatus === "held_by_my_group";
};
