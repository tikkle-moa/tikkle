import { NavLink } from "react-router";

import { House, Search, UserRound } from "lucide-react";

import { ROUTE_PATHS } from "@shared/config/router.config";

const TAB_CLASS_NAME = "flex min-w-0 flex-1 flex-col items-center gap-1 py-2 text-xs font-medium transition-colors";

const MobileBottomNavigation = () => (
  <nav aria-label="모바일 주요 메뉴" className="fixed inset-x-0 bottom-0 z-20 border-t border-gray-200 bg-white md:hidden">
    <div className="mx-auto flex h-16 max-w-screen-sm">
      <NavLink className={({ isActive }) => `${TAB_CLASS_NAME} ${isActive ? "text-brand-primary" : "text-gray-500"}`} to={ROUTE_PATHS.HOME}>
        <House aria-hidden="true" size={20} />
        <span>홈</span>
      </NavLink>

      <NavLink className={({ isActive }) => `${TAB_CLASS_NAME} ${isActive ? "text-brand-primary" : "text-gray-500"}`} to={ROUTE_PATHS.SEARCH}>
        <Search aria-hidden="true" size={20} />
        <span>검색</span>
      </NavLink>

      <NavLink className={({ isActive }) => `${TAB_CLASS_NAME} ${isActive ? "text-brand-primary" : "text-gray-500"}`} to={ROUTE_PATHS.MY}>
        <UserRound aria-hidden="true" size={20} />
        <span>마이</span>
      </NavLink>
    </div>
  </nav>
);

export default MobileBottomNavigation;
