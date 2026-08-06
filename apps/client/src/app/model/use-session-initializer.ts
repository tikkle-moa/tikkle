import { useEffect, useRef } from "react";

import { type User, useSessionStore } from "../../entities/session";
import type { ApiResponse } from "../../shared/api";

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
        const response = await fetch("/api/auth/me", {
          credentials: "include",
        });

        if (!response.ok) {
          clearSession();
          return;
        }

        const body = (await response.json()) as ApiResponse<User>;

        if (!body.success || body.data === undefined || body.data === null) {
          clearSession();
          return;
        }

        setSession(body.data);
      } catch {
        // 모든 예외에서 세션 해제
        clearSession();
      }
    };

    void initializeSession();
  }, [clearSession, setSession]);
};
