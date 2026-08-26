import type { components } from "@tikkle/api-types";

export type PerformanceStatus = "available" | "upcoming" | "ended";

export interface PerformanceStatusItem {
  label: string;
  className: string;
}

export type PerformanceResponse = components["schemas"]["PerformanceResponse"];
export type SeatResponse = components["schemas"]["SeatResponse"];
