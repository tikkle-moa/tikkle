import { NavLink } from "react-router";

import { Search } from "lucide-react";

import { ROUTE_PATHS } from "@shared/config/router.config";

import { useSessionStore } from "@entities/session";

import UserMenu from "./UserMenu";

import { useHeader } from "../model/use-header";

const Header = () => {
  const { handleLogout } = useHeader();

  const user = useSessionStore((state) => state.user);
  const status = useSessionStore((state) => state.status);

  return (
    <header className="bg-white">
      <nav aria-label="주요 메뉴" className="mx-auto flex h-16 w-full max-w-screen-2xl items-center px-4 sm:px-6 lg:px-8">
        <NavLink aria-label="Tikkle 홈으로 이동" className="flex shrink-0 items-center" to={ROUTE_PATHS.HOME}>
          <img alt="Tikkle" className="h-10 w-auto" src="/brand/tikkle-logo.svg" />
        </NavLink>

        <form className="ml-8 hidden max-w-md grow md:block" role="search">
          <label className="sr-only" htmlFor="header-search">
            공연 검색
          </label>
          <div className="flex items-center gap-2 rounded-lg bg-gray-100 px-3 py-2">
            <Search aria-hidden="true" className="text-gray-500" size={18} />
            <input
              className="min-w-0 grow bg-transparent text-sm text-gray-900 outline-none placeholder:text-gray-500"
              id="header-search"
              placeholder="공연명, 아티스트, 장소를 검색해 보세요"
              type="search"
            />
          </div>
        </form>

        <div className="ml-auto flex items-center">
          {status === "loading" && <span className="text-sm text-gray-500">로그인 확인 중</span>}
          {status === "authenticated" && user && <UserMenu nickname={user.nickname} onLogout={() => void handleLogout()} />}
          {status === "unauthenticated" && (
            <NavLink
              className="bg-brand-primary rounded-md px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-violet-700"
              to={ROUTE_PATHS.LOGIN}
            >
              로그인
            </NavLink>
          )}
        </div>
      </nav>
    </header>
  );
};

export default Header;
