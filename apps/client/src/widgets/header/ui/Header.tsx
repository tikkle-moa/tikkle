import { useSessionStore } from "@entities/session";

import UserMenu from "./UserMenu";

import { useHeader } from "../model/use-header";

const Header = () => {
  const { goToHome, goToLogin, handleLogout } = useHeader();

  const user = useSessionStore((state) => state.user);
  const status = useSessionStore((state) => state.status);

  return (
    <header className="border-b border-gray-200 bg-white">
      <nav aria-label="주요 메뉴" className="mx-auto flex h-16 w-full max-w-screen-2xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <button aria-label="Tikkle 홈으로 이동" className="flex items-center" type="button" onClick={goToHome}>
          <img alt="Tikkle" className="h-10 w-auto" src="/brand/tikkle-logo.svg" />
        </button>

        <div className="flex items-center">
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
