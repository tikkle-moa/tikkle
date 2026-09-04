import { ROUTE_PATHS } from "@shared/config/router.config";

import type { SecondaryHeaderItem } from "./secondary-header.types";

export const SECONDARY_HEADER_ITEMS: SecondaryHeaderItem[] = [
  {
    label: "홈",
    path: ROUTE_PATHS.HOME,
  },
  {
    label: "콘서트",
    path: ROUTE_PATHS.CONCERT_LIST,
  },
  {
    label: "공연장",
    path: ROUTE_PATHS.VENUE_LIST,
  },
];

export const LINK_CLASS_NAME = "px-1 py-4 text-sm font-semibold transition-colors";
