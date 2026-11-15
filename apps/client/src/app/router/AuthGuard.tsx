import { Navigate, Outlet, useLocation } from "react-router";

import { ROUTE_PATHS } from "@shared/config/router.config";

import { useSessionStore } from "@entities/session";

const AuthGuard = () => {
  const status = useSessionStore((state) => state.status);
  const location = useLocation();

  if (status === "loading") {
    return null;
  }

  if (status === "unauthenticated") {
    const redirectUri = `${location.pathname}${location.search}`;
    const searchParams = new URLSearchParams({ redirect_uri: redirectUri });
    return <Navigate to={`${ROUTE_PATHS.LOGIN}?${searchParams.toString()}`} replace />;
  }

  return <Outlet />;
};

export default AuthGuard;
