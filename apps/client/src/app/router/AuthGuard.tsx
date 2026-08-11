import { Navigate, Outlet } from "react-router";

import { ROUTE_PATHS } from "@shared/config/router.config";

import { useSessionStore } from "@entities/session";

const AuthGuard = () => {
  const status = useSessionStore((state) => state.status);

  if (status === "loading") {
    return null;
  }

  if (status === "unauthenticated") {
    return <Navigate to={ROUTE_PATHS.LOGIN} replace />;
  }

  return <Outlet />;
};

export default AuthGuard;
