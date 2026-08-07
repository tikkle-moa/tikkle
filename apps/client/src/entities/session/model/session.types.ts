import type { components } from "@tikkle/api-types";

export type AuthStatus = "loading" | "authenticated" | "unauthenticated";

export type User = components["schemas"]["CurrentUserResponse"];
