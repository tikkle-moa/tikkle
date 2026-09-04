import type { Middleware } from "openapi-fetch";

import { refreshAccessToken } from "./refresh-token";

let refreshPromise: Promise<boolean> | null = null;

export const createRefreshTokenMiddleware = (onSessionExpired: () => void): Middleware => ({
  async onResponse({ request, response }) {
    if (response.status !== 401 || request.url.includes("/api/auth/refresh")) {
      return response;
    }

    if (!refreshPromise) {
      refreshPromise = refreshAccessToken().finally(() => {
        refreshPromise = null;
      });
    }

    const refreshed = await refreshPromise.catch(() => false);

    if (!refreshed) {
      onSessionExpired();
      return response;
    }

    return fetch(request.clone());
  },
});
