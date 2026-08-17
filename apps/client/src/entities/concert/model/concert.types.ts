import type { LucideIcon } from "lucide-react";

import type { RoutePaths } from "@shared/config/router.config";

export type ConcertGenre = "BALLAD" | "ROCK_METAL" | "RAP_HIPHOP" | "JAZZ_SOUL" | "TROT" | "INTERNATIONAL_ARTIST" | "FESTIVAL" | "INDIE";

export interface ConcertGenreItem {
  icon: LucideIcon;
  label: string;
  className: string;
  to: RoutePaths;
}

export type BookingStatus = "available" | "soldout" | "upcoming" | "ended";

export interface BookingStatusItem {
  label: string;
  className: string;
}

/**
 * 공연 API 응답 타입 정의
 * 해당 타입은 추후 OpenAPI 스펙을 기반으로 수정이 필요합니다.
 */
export interface PerformanceResponse {
  id: number;
  concertId: number;
  startsAt: Date;
  bookingOpensAt?: Date;
  createdAt: Date;
  totalSeats: number;
  bookedSeats: number;
}

export interface ConcertResponse {
  id: number;
  title: string;
  genre: ConcertGenre;
  placeName: string;
  posterUrl?: string;
  description?: string;
  createdAt: Date;
  performances: PerformanceResponse[];
}
