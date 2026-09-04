import { getCookie } from "@shared/lib/cookie.utils";

export const refreshAccessToken = async (): Promise<boolean> => {
  const csrfToken = getCookie("XSRF-TOKEN");

  const response = await fetch("/api/auth/refresh", {
    method: "POST",
    credentials: "include",
    ...(csrfToken && { headers: { "X-XSRF-TOKEN": csrfToken } }),
  });

  return response.ok;
};
