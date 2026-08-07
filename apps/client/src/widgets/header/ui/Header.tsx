import { ROUTE_PATHS } from "@shared/config/router.config";

import { useSessionStore } from "@entities/session";

import { useHeader } from "../model/use-header";

const Header = () => {
  const { handleNavigation } = useHeader();

  const user = useSessionStore((state) => state.user);
  const status = useSessionStore((state) => state.status);

  return (
    <header className="bg-blue-500 p-4 text-white">
      <nav className="flex items-center justify-between">
        <div className="text-lg font-bold">Tikkle</div>

        <div className="flex items-center gap-4">
          <button className="hover:underline" onClick={() => handleNavigation(ROUTE_PATHS.HOME)}>
            Home
          </button>

          <button className="hover:underline" onClick={() => handleNavigation(ROUTE_PATHS.CONCERTS)}>
            Concerts
          </button>

          {status === "loading" ? (
            <span className="text-sm text-blue-100">로그인 확인 중</span>
          ) : status === "authenticated" && user ? (
            <span>{user.nickname}</span>
          ) : (
            <button type="button" onClick={() => handleNavigation(ROUTE_PATHS.LOGIN)}>
              로그인
            </button>
          )}
        </div>
      </nav>
    </header>
  );
};

export default Header;
