import { Link } from "react-router";

import { Plus } from "lucide-react";

import { ROUTE_PATHS } from "@shared/config/router.config";

import { USER_ROLE, useSessionStore } from "@entities/session";

const ConcertListPage = () => {
  const user = useSessionStore((state) => state.user);
  const isAdmin = user?.role === USER_ROLE.ADMIN;

  return (
    <div className="flex flex-col gap-6">
      <h1 className="px-4 text-lg font-bold text-gray-900 md:px-0">공연 목록</h1>

      {isAdmin && (
        <Link
          to={ROUTE_PATHS.CONCERT_NEW}
          className="bg-brand-primary inline-flex items-center justify-center gap-2 self-start rounded-lg px-4 py-2.5 text-sm font-semibold text-white transition hover:brightness-95"
        >
          <Plus className="size-4" aria-hidden />
          콘서트 등록
        </Link>
      )}
    </div>
  );
};

export default ConcertListPage;
