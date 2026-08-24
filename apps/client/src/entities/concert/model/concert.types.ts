import type { components } from "@tikkle/api-types";
import type { LucideIcon } from "lucide-react";

import type { RoutePaths } from "@shared/config/router.config";

export type ConcertGenre = components["schemas"]["ConcertGenre"];

export interface ConcertGenreItem {
  icon: LucideIcon;
  label: string;
  className: string;
  to: RoutePaths;
}

export type BookingStatus = "available" | "upcoming" | "ended";

export interface BookingStatusItem {
  label: string;
  className: string;
}

export type PerformanceResponse = components["schemas"]["PerformanceResponse"];

export type ConcertResponse = components["schemas"]["ConcertResponse"];

export type CreateConcertRequest = components["schemas"]["CreateConcertRequest"];
