import { getCookie } from "@shared/lib/cookie.utils";

import type { RefreshResult } from "./refresh-token.types";

type AccessTokenRefreshListener = () => void | Promise<void>;

let refreshPromise: Promise<RefreshResult> | null = null;

const refreshListeners = new Set<AccessTokenRefreshListener>();

export const subscribeAccessTokenRefresh = (listener: AccessTokenRefreshListener) => {
  refreshListeners.add(listener);

  return () => {
    refreshListeners.delete(listener);
  };
};

const notifyAccessTokenRefresh = async () => {
  await Promise.all([...refreshListeners].map((listener) => Promise.resolve().then(listener)));
};

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
    refreshPromise = requestAccessTokenRefresh()
      .then(async (result) => {
        if (result.type === "success") {
          await notifyAccessTokenRefresh();
        }

        return result;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }

  return refreshPromise;
};
