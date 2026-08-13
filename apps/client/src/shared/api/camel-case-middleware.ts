import type { Middleware } from "openapi-fetch";

const toCamelCase = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map(toCamelCase);
  }

  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, nestedValue]) => [
        key.replace(/_([a-z])/g, (_, character: string) => character.toUpperCase()),
        toCamelCase(nestedValue),
      ]),
    );
  }

  return value;
};

export const camelCaseMiddleware: Middleware = {
  async onResponse({ response }) {
    if (!response.headers.get("content-type")?.includes("application/json")) {
      return response;
    }

    const body = await response.clone().json();
    const headers = new Headers(response.headers);

    headers.delete("content-length");

    return new Response(JSON.stringify(toCamelCase(body)), {
      headers,
      status: response.status,
      statusText: response.statusText,
    });
  },
};
