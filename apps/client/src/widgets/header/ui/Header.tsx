import { NavLink } from "react-router";

import { ROUTE_PATHS } from "@shared/config/router.config";

import { useSessionStore } from "@entities/session";

import UserMenu from "./UserMenu";

import { useHeader } from "../model/use-header";

const Header = () => {
  const { goToLogin, handleLogout } = useHeader();

  const user = useSessionStore((state) => state.user);
  const status = useSessionStore((state) => state.status);

  return (
    <header className="border-b border-gray-200 bg-white">
      <nav aria-label="주요 메뉴" className="mx-auto flex h-16 w-full max-w-screen-2xl items-center px-4 sm:px-6 lg:px-8">
        <NavLink aria-label="Tikkle 홈으로 이동" className="flex shrink-0 items-center" to={ROUTE_PATHS.HOME}>
          <img alt="Tikkle" className="h-10 w-auto" src="/brand/tikkle-logo.svg" />
        </NavLink>

        <NavLink
          className={({ isActive }) =>
            `ml-8 flex h-full items-center border-b-2 text-sm font-semibold transition-colors ${
              isActive ? "border-brand-primary text-brand-primary" : "hover:text-brand-primary border-transparent text-gray-600"
            }`
          }
          to={ROUTE_PATHS.CONCERTS}
        >
          콘서트
        </NavLink>

        <div className="ml-auto flex items-center">
          {status === "loading" && <span className="text-sm text-gray-500">로그인 확인 중</span>}
          {status === "authenticated" && user && <UserMenu nickname={user.nickname} onLogout={() => void handleLogout()} />}
          {status === "unauthenticated" && (
            <button
              className="bg-brand-primary rounded-md px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-violet-700"
              type="button"
              onClick={goToLogin}
            >
              로그인
            </button>
          )}
        </div>
      </nav>
    </header>
  );
};

export default Header;
