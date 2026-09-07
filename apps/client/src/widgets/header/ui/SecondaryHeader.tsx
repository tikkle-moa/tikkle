import { NavLink } from "react-router";

import { LINK_CLASS_NAME, SECONDARY_HEADER_ITEMS } from "../model/secondary-header.constants";

const SecondaryHeader = () => (
  <nav aria-label="데스크톱 보조 메뉴" className="hidden bg-white md:block">
    <div className="mx-auto flex max-w-6xl gap-8 px-6">
      {SECONDARY_HEADER_ITEMS.map(({ label, path }) => (
        <NavLink
          key={label}
          className={({ isActive }) =>
            `${LINK_CLASS_NAME} ${isActive ? "border-brand-primary text-brand-primary border-b-2" : "hover:text-brand-primary text-gray-600"}`
          }
          to={path}
        >
          {label}
        </NavLink>
      ))}
    </div>
  </nav>
);

export default SecondaryHeader;
