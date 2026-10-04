import { expect } from "@playwright/test";
import { randomUUID } from "node:crypto";

import { createApiAuthHeaders } from "../api/auth.api";
import { TEST_CSRF_TOKEN } from "../config/api.config";
import { test } from "../fixtures/reservation-access.fixture";

test.describe("예매 접근 권한", () => {
  test("비인증 요청은 예매 목록·상세·취소에서 401을 반환한다", async ({ page, reservationAccessScenario }) => {
    const unauthenticatedHeaders = {
      Cookie: `XSRF-TOKEN=${TEST_CSRF_TOKEN}`,
      "X-XSRF-TOKEN": TEST_CSRF_TOKEN,
    };

    const listResponse = await page.request.get("/api/reservations", { headers: unauthenticatedHeaders });
    const detailResponse = await page.request.get(`/api/reservations/${reservationAccessScenario.ownerReservationId}`, {
      headers: unauthenticatedHeaders,
    });
    const cancelResponse = await page.request.post(`/api/reservations/${reservationAccessScenario.ownerReservationId}/cancel`, {
      headers: unauthenticatedHeaders,
      data: { requestId: randomUUID() },
    });

    expect(listResponse.status()).toBe(401);
    expect(detailResponse.status()).toBe(401);
    expect(cancelResponse.status()).toBe(401);
  });

  test("목록에는 로그인한 사용자의 예매만 포함한다", async ({ page, reservationAccessScenario }) => {
    const response = await page.request.get("/api/reservations", {
      headers: createApiAuthHeaders("USER", 2),
    });
    const body = await response.json();
    const reservationIds = (body.data as { id: number }[]).map(({ id }) => id);

    expect(response.status(), JSON.stringify(body)).toBe(200);
    expect(body.success).toBe(true);
    expect(reservationIds).toContain(reservationAccessScenario.ownerReservationId);
    expect(reservationIds).not.toContain(reservationAccessScenario.otherReservationId);
  });

  test("예매 소유자는 상세를 조회하고 다른 사용자는 조회할 수 없다", async ({ page, reservationAccessScenario }) => {
    const ownResponse = await page.request.get(`/api/reservations/${reservationAccessScenario.ownerReservationId}`, {
      headers: createApiAuthHeaders("USER", 2),
    });
    const ownBody = await ownResponse.json();
    expect(ownResponse.status(), JSON.stringify(ownBody)).toBe(200);
    expect(ownBody.data).toMatchObject({ id: reservationAccessScenario.ownerReservationId, status: "SUCCEEDED" });

    const otherResponse = await page.request.get(`/api/reservations/${reservationAccessScenario.ownerReservationId}`, {
      headers: createApiAuthHeaders("USER", 3),
    });

    expect(otherResponse.status()).toBe(403);
  });

  test("다른 사용자의 예매 취소를 거부하고 예매 상태를 유지한다", async ({ page, reservationAccessScenario }) => {
    const cancelResponse = await page.request.post(`/api/reservations/${reservationAccessScenario.ownerReservationId}/cancel`, {
      headers: createApiAuthHeaders("USER", 3),
      data: { requestId: randomUUID() },
    });

    expect(cancelResponse.status()).toBe(403);

    const ownerResponse = await page.request.get(`/api/reservations/${reservationAccessScenario.ownerReservationId}`, {
      headers: createApiAuthHeaders("USER", 2),
    });
    const ownerBody = await ownerResponse.json();
    expect(ownerResponse.status(), JSON.stringify(ownerBody)).toBe(200);
    expect(ownerBody.data.status).toBe("SUCCEEDED");
  });
});
