import { type Page } from "@playwright/test";
import { createHmac } from "node:crypto";

import type { UserRole } from "../../src/entities/session/model/session.types";
import { TEST_CSRF_TOKEN } from "../config/api.config";

export const createTestUser = (role: UserRole) => ({
  id: role === "ADMIN" ? 1 : 2,
  email: `${role.toLowerCase()}@example.com`,
  nickname: role === "ADMIN" ? "E2E 관리자" : "E2E 사용자",
  profileImageUrl: null,
  role,
  oauthAccounts: ["google"],
});

const encode = (value: object | string) => Buffer.from(typeof value === "string" ? value : JSON.stringify(value)).toString("base64url");

const createAccessToken = (role: UserRole) => {
  const secret = process.env.E2E_JWT_SECRET ?? "e2e-jwt-secret-key-must-be-at-least-32-bytes";

  const now = Math.floor(Date.now() / 1000);
  const header = encode({ alg: "HS256", typ: "JWT" });
  const payload = encode({ sub: role === "ADMIN" ? "1" : "2", type: "ACCESS", role, iat: now, exp: now + 3600 });
  const unsignedToken = `${header}.${payload}`;
  const signature = createHmac("sha256", secret).update(unsignedToken).digest("base64url");

  return `${unsignedToken}.${signature}`;
};

export const mockOAuthSession = async (page: Page, role: UserRole) => {
  await page.route("**/api/auth/me", (route) =>
    route.fulfill({
      json: { success: true, data: createTestUser(role) },
    }),
  );
};

export const setApiRole = async (page: Page, role: UserRole) => {
  const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:5173";
  await page.context().addCookies([
    { name: "access_token", value: createAccessToken(role), url: baseURL, httpOnly: true, sameSite: "Lax" },
    { name: "XSRF-TOKEN", value: TEST_CSRF_TOKEN, url: baseURL, sameSite: "Lax" },
  ]);
};

export const authenticatePage = async (page: Page, role: UserRole) => {
  await setApiRole(page, role);
  await mockOAuthSession(page, role);
};
