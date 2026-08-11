import { apiClient } from "@shared/api";

import { useSessionStore } from "@entities/session";

export const useLogout = () => {
  const logoutSession = useSessionStore((state) => state.logoutSession);

  const handleLogout = async () => {
    try {
      const { data, error } = await apiClient.POST("/api/auth/logout");

      if (error || !data.success) {
        throw new Error("Logout failed");
      }
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      logoutSession();
    }
  };

  return { handleLogout };
};
