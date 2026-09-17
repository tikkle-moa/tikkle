import { formatTime } from "@shared/lib/date.utils";

import type { VenueSeatResponse, VenueSeatStatus } from "@entities/venue";

import { SECTION_COLOR_LIGHTNESS, SECTION_COLOR_SATURATION } from "./venue-map.constants";
import type { TooltipPlacement } from "./venue-map.types";

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

export const getOppositeTooltipPlacement = (isTop: boolean, isLeft: boolean): TooltipPlacement => {
  if (isTop) return isLeft ? "bottom-right" : "bottom-left";
  return isLeft ? "top-right" : "top-left";
};

export const isCurrentSeatSelectable = (element: SVGGElement) => {
  const currentStatus = element.dataset.seatStatus;
  return currentStatus === "available" || currentStatus === "held_by_my_group";
};
