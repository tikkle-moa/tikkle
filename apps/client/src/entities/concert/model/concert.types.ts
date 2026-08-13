import type { RoutePaths } from "@shared/config/router.config";

export type ConcertCategory = "ballad" | "rock-metal" | "rap-hiphop" | "jazz-soul" | "trot" | "international-artist" | "festival" | "indie";

export interface ConcertCategoryItem {
  emoji: string;
  label: string;
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
  placeName: string;
  posterUrl?: string;
  description?: string;
  createdAt: Date;
  performances: PerformanceResponse[];
}
