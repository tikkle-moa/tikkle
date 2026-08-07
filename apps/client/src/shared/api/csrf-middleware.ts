import type { Middleware } from "openapi-fetch";

import { getCookie } from "@shared/lib/cookie.utils";

const CSRF_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

export const csrfMiddleware: Middleware = {
  onRequest({ request }) {
    if (!CSRF_METHODS.has(request.method.toUpperCase())) {
      return request;
    }

    const csrfToken = getCookie("XSRF-TOKEN");

    if (csrfToken) {
      request.headers.set("X-XSRF-TOKEN", csrfToken);
    }

    return request;
  },
};
