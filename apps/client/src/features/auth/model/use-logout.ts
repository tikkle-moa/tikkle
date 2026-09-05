import { apiClient } from "@shared/api";
import { useStompStore } from "@shared/realtime/stomp.store";

import { useSessionStore } from "@entities/session";

export const useLogout = () => {
  const logoutSession = useSessionStore((state) => state.logoutSession);
  const disconnect = useStompStore((state) => state.disconnect);

  const handleLogout = async () => {
    try {
      const { data, error } = await apiClient.POST("/api/auth/logout");

      if (error || !data.success) {
        throw new Error("Logout failed");
      }
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      await disconnect();
      logoutSession();
    }
  };

  return { handleLogout };
};
