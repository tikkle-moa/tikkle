import type { UserRole } from "./session.types";

export const USER_ROLE = {
  USER: "USER",
  ADMIN: "ADMIN",
} as const satisfies Record<UserRole, UserRole>;
