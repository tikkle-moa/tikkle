import type { Middleware } from "openapi-fetch";

import { refreshAccessToken } from "./refresh-token";

export const createRefreshTokenMiddleware = (onSessionExpired: () => void): Middleware => ({
  async onResponse({ request, response }) {
    if (response.status !== 401 || request.url.includes("/api/auth/refresh")) {
      return response;
    }

    const refreshed = await refreshAccessToken().catch(() => false);

    if (!refreshed) {
      onSessionExpired();
      return response;
    }

    return fetch(request.clone());
  },
});
