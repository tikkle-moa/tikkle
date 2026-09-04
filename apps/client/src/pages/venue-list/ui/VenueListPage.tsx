import { Link } from "react-router";

import { Plus } from "lucide-react";

import { ROUTE_PATHS } from "@shared/config/router.config";

import { USER_ROLE, useSessionStore } from "@entities/session";

const VenueListPage = () => {
  const isAdmin = useSessionStore((state) => state.user?.role === USER_ROLE.ADMIN);

  return (
    <section className="mx-auto w-full max-w-6xl">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-bold text-slate-900 sm:text-xl">공연장 목록</h1>
          <p className="mt-1 text-sm text-slate-500">등록된 공연장과 기본 배치 정보를 확인하세요.</p>
        </div>
        {isAdmin && (
          <Link
            className="bg-brand-primary inline-flex shrink-0 items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-white hover:brightness-95"
            to={ROUTE_PATHS.VENUE_NEW}
          >
            <Plus className="size-4" aria-hidden /> 공연장 등록
          </Link>
        )}
      </div>
    </section>
  );
};

export default VenueListPage;
