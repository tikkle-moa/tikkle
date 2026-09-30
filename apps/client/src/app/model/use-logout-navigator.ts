import { useEffect } from "react";
import { matchPath, useLocation, useNavigate } from "react-router";

import { GUARDED_PATHS, ROUTE_PATHS } from "@shared/config/router.config";

import { useSessionStore } from "@entities/session";

export const useLogoutNavigator = () => {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const justLoggedOut = useSessionStore((state) => state.justLoggedOut);
  const clearSession = useSessionStore((state) => state.clearSession);

  useEffect(() => {
    if (!justLoggedOut) return;

    if (GUARDED_PATHS.some((path) => matchPath(path, pathname))) {
      void navigate(ROUTE_PATHS.HOME, { replace: true });
      return;
    }
    clearSession();
  }, [justLoggedOut, navigate, clearSession, pathname]);
};
