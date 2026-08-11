import type { Middleware } from "openapi-fetch";

import { getCookie } from "@shared/lib/cookie.utils";

let refreshPromise: Promise<boolean> | null = null;

const refreshToken = async (): Promise<boolean> => {
  const csrfToken = getCookie("XSRF-TOKEN");

  const response = await fetch("/api/auth/refresh", {
    method: "POST",
    credentials: "include",
    ...(csrfToken && { headers: { "X-XSRF-TOKEN": csrfToken } }),
  });

  return response.ok;
};

export const createRefreshTokenMiddleware = (onSessionExpired: () => void): Middleware => ({
  async onResponse({ request, response }) {
    if (response.status !== 401 || request.url.includes("/api/auth/refresh")) {
      return response;
    }

    if (!refreshPromise) {
      refreshPromise = refreshToken().finally(() => {
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
