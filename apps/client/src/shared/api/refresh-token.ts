import { getCookie } from "@shared/lib/cookie.utils";

let refreshPromise: Promise<boolean> | null = null;

const requestAccessTokenRefresh = async (): Promise<boolean> => {
  const csrfToken = getCookie("XSRF-TOKEN");

  const response = await fetch("/api/auth/refresh", {
    method: "POST",
    credentials: "include",
    ...(csrfToken && { headers: { "X-XSRF-TOKEN": csrfToken } }),
  });

  return response.ok;
};

export const refreshAccessToken = (): Promise<boolean> => {
  if (!refreshPromise) {
    refreshPromise = requestAccessTokenRefresh().finally(() => {
      refreshPromise = null;
    });
  }

  return refreshPromise;
};
