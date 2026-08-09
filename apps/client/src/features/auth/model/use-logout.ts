import { useNavigate } from "react-router";

import { apiClient } from "@shared/api";
import { ROUTE_PATHS } from "@shared/config/router.config";

import { useSessionStore } from "@entities/session";

export const useLogout = () => {
  const navigate = useNavigate();
  const clearSession = useSessionStore((state) => state.clearSession);

  const handleLogout = async () => {
    try {
      const { data, error } = await apiClient.POST("/api/auth/logout");

      if (error || !data.success) {
        throw new Error("Logout failed");
      }
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      clearSession();
      void navigate(ROUTE_PATHS.LOGIN, { replace: true });
    }
  };

  return { handleLogout };
};
