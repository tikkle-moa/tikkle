import { create } from "zustand";

import type { AuthStatus, User } from "./session.types";

interface ApiResponse<T> {
  success: boolean;
  data: T;
}

interface SessionState {
  user: User | null;
  status: AuthStatus;

  initialize: () => Promise<void>;
  clearSession: () => void;
}

export const useSessionStore = create<SessionState>((set, get) => ({
  user: null,
  status: "idle",

  initialize: async () => {
    if (get().status === "loading") {
      return;
    }

    set({
      status: "loading",
    });

    try {
      const response = await fetch("/api/auth/me", {
        credentials: "include",
      });

      if (response.status === 401) {
        set({
          user: null,
          status: "unauthenticated",
        });
        return;
      }

      if (!response.ok) {
        throw new Error("로그인 상태를 확인하지 못했습니다.");
      }

      const body = (await response.json()) as ApiResponse<User>;

      set({
        user: body.data,
        status: "authenticated",
      });
    } catch {
      set((state) => ({
        status: state.user ? "authenticated" : "error",
      }));
    }
  },

  clearSession: () =>
    set({
      user: null,
      status: "unauthenticated",
    }),
}));
