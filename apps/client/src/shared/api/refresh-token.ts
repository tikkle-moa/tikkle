import { getCookie } from "@shared/lib/cookie.utils";

import type { RefreshResult } from "./refresh-token.types";

let refreshPromise: Promise<RefreshResult> | null = null;

const requestAccessTokenRefresh = async (): Promise<RefreshResult> => {
  const csrfToken = getCookie("XSRF-TOKEN");

  try {
    const response = await fetch("/api/auth/refresh", {
      method: "POST",
      credentials: "include",
      ...(csrfToken && { headers: { "X-XSRF-TOKEN": csrfToken } }),
    });

    if (response.ok) {
      return { type: "success" };
    }

    if (response.status === 401 || response.status === 403) {
      return { type: "authentication-failed" };
    }

    return { type: "retryable-failed" };
  } catch {
    return { type: "retryable-failed" };
  }
};

export const refreshAccessToken = (): Promise<RefreshResult> => {
  if (!refreshPromise) {
    refreshPromise = requestAccessTokenRefresh().finally(() => {
      refreshPromise = null;
    });
  }

  return refreshPromise;
};
