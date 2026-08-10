import { ROUTE_PATHS } from "@shared/config/router.config";

export type ConcertCategory = "ballad" | "rock-metal" | "rap-hiphop" | "jazz-soul" | "trot" | "international-artist" | "festival" | "indie";

export interface ConcertCategoryItem {
  emoji: string;
  label: string;
  to: (typeof ROUTE_PATHS)[keyof typeof ROUTE_PATHS];
}
