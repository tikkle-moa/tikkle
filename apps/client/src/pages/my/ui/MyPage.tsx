import { Link } from "react-router";

import { ChevronRight, LogOut } from "lucide-react";

import { ROUTE_PATHS } from "@shared/config/router.config";
import ProfileImage from "@shared/ui/ProfileImage";

import { MY_MENU_ITEMS } from "../model/my-menu.constants";
import { useMyPage } from "../model/use-my-page";

const MyPage = () => {
  const { handleLogout, status, user } = useMyPage();

  if (status === "loading") {
    return null;
  }

  return (
    <main className="min-h-[calc(100vh-4rem)] py-8 sm:py-12">
      <section aria-labelledby="my-page-title" className="mx-auto max-w-2xl px-4 sm:px-6">
        <h1 id="my-page-title" className="text-brand-ink text-2xl font-bold tracking-tight">
          마이
        </h1>

        {user ? (
          <section className="mt-5 flex items-center gap-4 rounded-2xl bg-white px-5 py-6 shadow-sm ring-1 ring-black/5 sm:px-6">
            <ProfileImage alt={`${user.nickname} 프로필 이미지`} className="size-14 ring-4 ring-violet-100" src={user.profileImageUrl} />
            <div>
              <p className="text-brand-ink text-lg font-bold tracking-tight">{user.nickname}님, 반가워요</p>
              <p className="mt-1 text-sm text-gray-500">일행과 함께 고를 공연을 찾아보세요.</p>
            </div>
          </section>
        ) : (
          <section className="mt-5 rounded-2xl bg-white px-5 py-6 shadow-sm ring-1 ring-black/5 sm:px-6">
            <p className="text-brand-ink mt-1 text-lg font-bold tracking-tight">로그인하여 원하는 공연을 찾아보세요</p>

            <Link
              className="bg-brand-primary mt-5 flex w-full items-center justify-center rounded-xl px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-violet-700"
              to={ROUTE_PATHS.LOGIN}
            >
              로그인하고 공연 찾아보기
            </Link>
          </section>
        )}

        <section aria-labelledby="my-ticket-title" className="mt-10">
          <div className="mb-3 flex items-center">
            <h2 id="my-ticket-title" className="text-brand-ink text-base font-bold">
              나의 티켓
            </h2>
          </div>

          <div className="space-y-3">
            {MY_MENU_ITEMS.map(({ description, icon: Icon, label, to }) => (
              <Link
                className="group focus-visible:outline-brand-primary flex items-center gap-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5 transition hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2"
                key={to}
                to={to}
              >
                <span className="text-brand-primary flex size-11 shrink-0 items-center justify-center rounded-xl bg-violet-50">
                  <Icon aria-hidden="true" size={21} />
                </span>

                <span className="min-w-0 grow">
                  <span className="text-brand-ink block text-base font-semibold">{label}</span>
                  <span className="mt-1 block text-sm text-gray-500">{description}</span>
                </span>

                <ChevronRight
                  aria-hidden="true"
                  className="group-hover:text-brand-primary shrink-0 text-gray-300 transition group-hover:translate-x-0.5"
                  size={21}
                />
              </Link>
            ))}
          </div>
        </section>

        {user && (
          <button
            className="mt-10 flex w-full items-center justify-center gap-2 text-sm font-medium text-gray-400 transition hover:text-gray-700"
            type="button"
            onClick={() => void handleLogout()}
          >
            <LogOut aria-hidden="true" size={16} />
            로그아웃
          </button>
        )}
      </section>
    </main>
  );
};

export default MyPage;
