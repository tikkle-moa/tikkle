import { Navigate, Outlet } from "react-router";

import { ROUTE_PATHS } from "@shared/config/router.config";

import { useSessionStore } from "@entities/session";

const GuestGuard = () => {
  const status = useSessionStore((state) => state.status);

  if (status === "loading") {
    return null;
  }

  if (status === "authenticated") {
    return <Navigate to={ROUTE_PATHS.HOME} replace />;
  }

  return <Outlet />;
};

export default GuestGuard;
