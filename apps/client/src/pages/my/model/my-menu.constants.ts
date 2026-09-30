import { CalendarDays, Heart } from "lucide-react";

import { ROUTE_PATHS } from "@shared/config/router.config";

import type { MyMenuItem } from "./my-menu.types";

export const MY_MENU_ITEMS: MyMenuItem[] = [
  {
    description: "예매 내역과 진행 중인 예약을 확인해요",
    icon: CalendarDays,
    label: "내 예약",
    to: ROUTE_PATHS.MY_RESERVATIONS,
  },
  {
    description: "다시 보고 싶은 공연을 모아보세요",
    icon: Heart,
    label: "관심",
    to: ROUTE_PATHS.MY_FAVORITES,
  },
];
