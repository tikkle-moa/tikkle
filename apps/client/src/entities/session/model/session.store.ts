import { create } from "zustand";

import type { AuthStatus, User } from "./session.types";

interface SessionStore {
  user: User | null;
  status: AuthStatus;
  justLoggedOut: boolean;

  setSession: (user: User) => void;
  clearSession: () => void;
  logoutSession: () => void;
}

export const useSessionStore = create<SessionStore>((set) => ({
  user: null,
  status: "loading",
  justLoggedOut: false,

  setSession: (user) =>
    set({
      user,
      status: "authenticated",
      justLoggedOut: false,
    }),

  clearSession: () =>
    set({
      user: null,
      status: "unauthenticated",
      justLoggedOut: false,
    }),

  logoutSession: () =>
    set({
      user: null,
      status: "loading",
      justLoggedOut: true,
    }),
}));
