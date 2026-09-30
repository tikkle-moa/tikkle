import { csrfMiddleware } from "@shared/api/csrf-middleware";

function makeRequest(method: string): Request {
  return new Request("https://example.com/api", { method });
}

function setCookie(value: string) {
  document.cookie = value;
}

function clearCookies() {
  document.cookie.split(";").forEach((cookie) => {
    const name = cookie.split("=")[0].trim();
    document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
  });
}

describe("csrfMiddleware", () => {
  beforeEach(() => {
    clearCookies();
  });

  it.each(["POST", "PUT", "PATCH", "DELETE"])("%s 요청에 XSRF-TOKEN 쿠키가 있으면 X-XSRF-TOKEN 헤더를 추가한다", (method) => {
    setCookie("XSRF-TOKEN=test-token");
    const request = makeRequest(method);

    const result = csrfMiddleware.onRequest!({ request } as Parameters<NonNullable<typeof csrfMiddleware.onRequest>>[0]) as Request;

    expect(result.headers.get("X-XSRF-TOKEN")).toBe("test-token");
  });

  it.each(["GET", "HEAD", "OPTIONS"])("%s 요청은 쿠키가 있어도 X-XSRF-TOKEN 헤더를 추가하지 않는다", (method) => {
    setCookie("XSRF-TOKEN=test-token");
    const request = makeRequest(method);

    const result = csrfMiddleware.onRequest!({ request } as Parameters<NonNullable<typeof csrfMiddleware.onRequest>>[0]) as Request;

    expect(result.headers.get("X-XSRF-TOKEN")).toBeNull();
  });

  it("XSRF-TOKEN 쿠키가 없으면 X-XSRF-TOKEN 헤더를 추가하지 않는다", () => {
    const request = makeRequest("POST");

    const result = csrfMiddleware.onRequest!({ request } as Parameters<NonNullable<typeof csrfMiddleware.onRequest>>[0]) as Request;

    expect(result.headers.get("X-XSRF-TOKEN")).toBeNull();
  });
});
