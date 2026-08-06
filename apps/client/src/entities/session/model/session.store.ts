import { create } from "zustand";

import type { AuthStatus, User } from "./session.types";

interface SessionStore {
  user: User | null;
  status: AuthStatus;

  setSession: (user: User) => void;
  clearSession: () => void;
}

export const useSessionStore = create<SessionStore>((set) => ({
  user: null,
  status: "loading",

  setSession: (user) =>
    set({
      user,
      status: "authenticated",
    }),

  clearSession: () =>
    set({
      user: null,
      status: "unauthenticated",
    }),
}));
