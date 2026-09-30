import { Navigate, Outlet } from "react-router";

import { ROUTE_PATHS } from "@shared/config/router.config";

import { USER_ROLE, useSessionStore } from "@entities/session";

const AdminGuard = () => {
  const user = useSessionStore((state) => state.user);
  const status = useSessionStore((state) => state.status);

  if (status === "loading") {
    return null;
  }

  if (status === "unauthenticated" || !user) {
    return <Navigate to={ROUTE_PATHS.LOGIN} replace />;
  }

  if (user.role !== USER_ROLE.ADMIN) {
    return <Navigate to={ROUTE_PATHS.HOME} replace />;
  }

  return <Outlet />;
};

export default AdminGuard;
