import { ChevronDown, LogOut, UserRound } from "lucide-react";

import { useSessionStore } from "@entities/session";

import { useHeader } from "../model/use-header";
import { useHeaderUserMenu } from "../model/use-header-user-menu";

const Header = () => {
  const { goToHome, goToLogin, handleLogout } = useHeader();
  const { isUserMenuOpen, handleUserMenuClose, handleUserMenuToggle } = useHeaderUserMenu();

  const user = useSessionStore((state) => state.user);
  const status = useSessionStore((state) => state.status);

  const handleUserLogout = () => {
    handleUserMenuClose();
    void handleLogout();
  };

  return (
    <header className="border-b border-gray-200 bg-white">
      <nav aria-label="주요 메뉴" className="mx-auto flex h-16 w-full max-w-screen-2xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <button aria-label="Tikkle 홈으로 이동" className="flex items-center" type="button" onClick={goToHome}>
          <img alt="Tikkle" className="h-10 w-auto" src="/brand/tikkle-logo.svg" />
        </button>

        <div className="flex items-center">
          {status === "loading" ? (
            <span className="text-sm text-gray-500">로그인 확인 중</span>
          ) : status === "authenticated" && user ? (
            <div className="relative">
              <button
                aria-controls="user-menu"
                aria-expanded={isUserMenuOpen}
                className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100"
                type="button"
                onClick={handleUserMenuToggle}
              >
                <UserRound aria-hidden="true" size={18} />
                <span>{user.nickname}</span>
                <ChevronDown aria-hidden="true" className={isUserMenuOpen ? "rotate-180 transition-transform" : "transition-transform"} size={16} />
              </button>

              {isUserMenuOpen && (
                <div className="absolute right-0 z-10 mt-2 w-36 rounded-lg border border-gray-200 bg-white p-1 shadow-lg" id="user-menu">
                  <button
                    className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-100"
                    type="button"
                    onClick={handleUserLogout}
                  >
                    <LogOut aria-hidden="true" size={16} />
                    로그아웃
                  </button>
                </div>
              )}
            </div>
          ) : (
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
