import { useEffect, useRef } from "react";

import { apiClient } from "@shared/api";

import { useSessionStore } from "@entities/session";

export const useSessionInitializer = () => {
  const initializedRef = useRef(false);

  const setSession = useSessionStore((state) => state.setSession);
  const clearSession = useSessionStore((state) => state.clearSession);

  useEffect(() => {
    // 중복 요청 방지
    if (initializedRef.current) {
      return;
    }

    initializedRef.current = true;

    const initializeSession = async () => {
      try {
        const { data, error } = await apiClient.GET("/api/auth/me");

        if (error || !data.success || data.data == null) {
          throw new Error("Failed to fetch user data");
        }

        setSession(data.data);
      } catch {
        clearSession();
      }
    };

    void initializeSession();
  }, [clearSession, setSession]);
};
