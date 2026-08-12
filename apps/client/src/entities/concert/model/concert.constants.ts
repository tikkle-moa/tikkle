import { ROUTE_PATHS } from "@shared/config/router.config";

import type { BookingStatus, BookingStatusItem, ConcertCategory, ConcertCategoryItem } from "./concert.types";

export const CONCERT_CATEGORY_MAP: Record<ConcertCategory, ConcertCategoryItem> = {
  ballad: { emoji: "🎤", label: "발라드", to: ROUTE_PATHS.CONCERTS },
  "rock-metal": { emoji: "🎸", label: "락/메탈", to: ROUTE_PATHS.CONCERTS },
  "rap-hiphop": { emoji: "🎤", label: "랩/힙합", to: ROUTE_PATHS.CONCERTS },
  "jazz-soul": { emoji: "🎷", label: "재즈/소울", to: ROUTE_PATHS.CONCERTS },
  trot: { emoji: "🎹", label: "포크/트로트", to: ROUTE_PATHS.CONCERTS },
  "international-artist": { emoji: "🌍", label: "내한공연", to: ROUTE_PATHS.CONCERTS },
  festival: { emoji: "🎪", label: "페스티벌", to: ROUTE_PATHS.CONCERTS },
  indie: { emoji: "🎶", label: "인디", to: ROUTE_PATHS.CONCERTS },
};

export const BOOKING_STATUS_MAP: Record<BookingStatus, BookingStatusItem> = {
  available: { label: "예매 중", className: "bg-emerald-500 text-white" },
  soldout: { label: "매진", className: "bg-red-500 text-white" },
  upcoming: { label: "오픈 예정", className: "bg-violet-600 text-white" },
  ended: { label: "공연 종료", className: "bg-gray-400 text-white" },
};
