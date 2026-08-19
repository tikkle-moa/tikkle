import { NavLink } from "react-router";

import { ROUTE_PATHS } from "@shared/config/router.config";

const LINK_CLASS_NAME = "px-1 py-4 text-sm font-semibold transition-colors";

const SecondaryHeader = () => (
  <nav aria-label="데스크톱 보조 메뉴" className="hidden bg-white md:block">
    <div className="mx-auto flex max-w-6xl gap-8 px-6">
      <NavLink
        className={({ isActive }) =>
          `${LINK_CLASS_NAME} ${isActive ? "border-brand-primary text-brand-primary border-b-2" : "hover:text-brand-primary text-gray-600"}`
        }
        to={ROUTE_PATHS.HOME}
      >
        홈
      </NavLink>

      <NavLink
        className={({ isActive }) =>
          `${LINK_CLASS_NAME} ${isActive ? "border-brand-primary text-brand-primary border-b-2" : "hover:text-brand-primary text-gray-600"}`
        }
        to={ROUTE_PATHS.CONCERT_LIST}
      >
        콘서트
      </NavLink>
    </div>
  </nav>
);

export default SecondaryHeader;
