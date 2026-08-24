import { AudioLines, Drum, Earth, Guitar, MicVocal, Music2, PartyPopper, Radio } from "lucide-react";

import { ROUTE_PATHS } from "@shared/config/router.config";

import type { BookingStatus, BookingStatusItem, ConcertGenre, ConcertGenreItem } from "./concert.types";

export const CONCERT_GENRE_MAP: Record<ConcertGenre, ConcertGenreItem> = {
  BALLAD: { icon: MicVocal, label: "발라드", className: "bg-pink-100 text-pink-600", to: ROUTE_PATHS.CONCERT_LIST },
  ROCK_METAL: { icon: Guitar, label: "락/메탈", className: "bg-red-100 text-red-600", to: ROUTE_PATHS.CONCERT_LIST },
  RAP_HIPHOP: { icon: Radio, label: "랩/힙합", className: "bg-violet-100 text-violet-600", to: ROUTE_PATHS.CONCERT_LIST },
  JAZZ_SOUL: { icon: AudioLines, label: "재즈/소울", className: "bg-amber-100 text-amber-600", to: ROUTE_PATHS.CONCERT_LIST },
  TROT: { icon: Music2, label: "포크/트로트", className: "bg-orange-100 text-orange-600", to: ROUTE_PATHS.CONCERT_LIST },
  INTERNATIONAL_ARTIST: { icon: Earth, label: "내한공연", className: "bg-blue-100 text-blue-600", to: ROUTE_PATHS.CONCERT_LIST },
  FESTIVAL: { icon: PartyPopper, label: "페스티벌", className: "bg-emerald-100 text-emerald-600", to: ROUTE_PATHS.CONCERT_LIST },
  INDIE: { icon: Drum, label: "인디", className: "bg-cyan-100 text-cyan-600", to: ROUTE_PATHS.CONCERT_LIST },
};

export const BOOKING_STATUS_MAP: Record<BookingStatus, BookingStatusItem> = {
  available: { label: "예매 중", className: "bg-emerald-500 text-white" },
  soldout: { label: "매진", className: "bg-red-500 text-white" },
  upcoming: { label: "오픈 예정", className: "bg-violet-600 text-white" },
  ended: { label: "공연 종료", className: "bg-gray-400 text-white" },
};

export const CONCERT_QUERY_KEYS = {
  all: ["concerts"] as const,
  detail: (concertId: number) => [...CONCERT_QUERY_KEYS.all, "detail", concertId] as const,
  upcoming: () => [...CONCERT_QUERY_KEYS.all, "upcoming"] as const,
  hot: () => [...CONCERT_QUERY_KEYS.all, "hot"] as const,
  dailyRankings: () => [...CONCERT_QUERY_KEYS.all, "dailyRankings"] as const,
};
