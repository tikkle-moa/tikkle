import { type Page, expect, test } from "@playwright/test";

import { authenticatePage, createApiAuthHeaders, setApiRole } from "../api/auth.api";
import { createConcert, deleteConcert } from "../api/concert.api";
import { E2E_SEED_CONCERTS } from "../config/e2e-seed-data.config";

const STARTS_AT = "2099-01-20T19:00";
const UPDATED_STARTS_AT = "2099-01-21T19:00";
const BOOKING_OPENS_AT = "2099-01-10T10:00";

interface PerformanceResponse {
  id: number;
  concertId: number;
  name: string;
  startsAt: string;
  bookingOpensAt: string | null;
}

interface ApiSuccess<T> {
  success: boolean;
  data: T;
}

const fillPerformanceForm = async (
  page: Page,
  values: {
    name: string;
    startsAt: string;
    bookingOpensAt: string;
  },
) => {
  await page.getByLabel("공연 회차명").fill(values.name);
  await page.getByLabel("공연 시작 시각").fill(values.startsAt);
  await page.getByLabel("예매 시작 시각").fill(values.bookingOpensAt);
};

const createPerformance = async (
  page: Page,
  request: {
    concertId: number;
    name: string;
    startsAt: string;
    bookingOpensAt: string;
  },
) => {
  const response = await page.request.post("/api/performances", {
    headers: createApiAuthHeaders("ADMIN"),
    data: request,
  });
  const body = (await response.json()) as ApiSuccess<PerformanceResponse>;

  expect(response.status(), JSON.stringify(body)).toBe(201);

  return body.data;
};

const deletePerformance = async (page: Page, performanceId: number) => {
  const response = await page.request.delete(`/api/performances/${performanceId}`, {
    headers: createApiAuthHeaders("ADMIN"),
  });

  if (response.status() === 404) return;

  expect(response.ok(), await response.text()).toBe(true);
};

test.describe("공연 회차 등록 정상 처리", () => {
  test("관리자가 회차를 생성·수정·삭제하고 실제 조회 결과를 확인한다", async ({ page }) => {
    await authenticatePage(page, "ADMIN");
    const concert = await createConcert(page, "E2E 회차 정상 처리");
    let performanceId: number | undefined;

    try {
      await page.goto(`/concerts/${concert.id}/performances/new`);
      await page.getByRole("button", { name: "공연 회차 추가" }).click();
      await fillPerformanceForm(page, {
        name: "첫 공연",
        startsAt: STARTS_AT,
        bookingOpensAt: BOOKING_OPENS_AT,
      });

      const createResponsePromise = page.waitForResponse(
        (response) => response.url().endsWith("/api/performances") && response.request().method() === "POST",
      );
      await page.getByRole("button", { name: "등록", exact: true }).click();
      const createResponse = await createResponsePromise;
      const createBody = (await createResponse.json()) as ApiSuccess<PerformanceResponse>;

      expect(createResponse.status()).toBe(201);
      expect(createBody).toMatchObject({
        success: true,
        data: {
          concertId: concert.id,
          name: "첫 공연",
          startsAt: `${STARTS_AT}:00`,
          bookingOpensAt: `${BOOKING_OPENS_AT}:00`,
        },
      });
      performanceId = createBody.data.id;

      const createdDetailResponse = await page.request.get(`/api/concerts/${concert.id}`);
      const createdDetailBody = (await createdDetailResponse.json()) as ApiSuccess<{
        performances: PerformanceResponse[];
      }>;

      expect(createdDetailResponse.status()).toBe(200);
      expect(createdDetailBody.data.performances).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: performanceId,
            name: "첫 공연",
            startsAt: `${STARTS_AT}:00`,
          }),
        ]),
      );

      await page.getByRole("button", { name: "공연 회차 수정" }).click();
      await fillPerformanceForm(page, {
        name: "수정된 공연",
        startsAt: UPDATED_STARTS_AT,
        bookingOpensAt: BOOKING_OPENS_AT,
      });

      const updateResponsePromise = page.waitForResponse(
        (response) => response.url().endsWith(`/api/performances/${performanceId}`) && response.request().method() === "PATCH",
      );
      await page.getByRole("button", { name: "저장", exact: true }).click();
      const updateResponse = await updateResponsePromise;

      expect(updateResponse.status()).toBe(200);

      const updatedDetailResponse = await page.request.get(`/api/concerts/${concert.id}`);
      const updatedDetailBody = (await updatedDetailResponse.json()) as ApiSuccess<{
        performances: PerformanceResponse[];
      }>;

      expect(updatedDetailBody.data.performances).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: performanceId,
            name: "수정된 공연",
            startsAt: `${UPDATED_STARTS_AT}:00`,
          }),
        ]),
      );

      page.once("dialog", (dialog) => dialog.accept());
      const deleteResponsePromise = page.waitForResponse(
        (response) => response.url().endsWith(`/api/performances/${performanceId}`) && response.request().method() === "DELETE",
      );
      await page.getByRole("button", { name: "공연 회차 삭제" }).click();
      const deleteResponse = await deleteResponsePromise;

      expect(deleteResponse.status()).toBe(200);
      performanceId = undefined;

      const deletedDetailResponse = await page.request.get(`/api/concerts/${concert.id}`);
      const deletedDetailBody = (await deletedDetailResponse.json()) as ApiSuccess<{
        performances: PerformanceResponse[];
      }>;

      expect(deletedDetailBody.data.performances).not.toEqual(expect.arrayContaining([expect.objectContaining({ id: createBody.data.id })]));
    } finally {
      if (performanceId) {
        await deletePerformance(page, performanceId);
      }
      await deleteConcert(page, concert.id);
    }
  });
});

test.describe("공연 회차 등록 입력 검증", () => {
  test.beforeEach(async ({ page }) => {
    await authenticatePage(page, "ADMIN");
  });

  test("예매 시작 시각이 공연 시작 시각보다 늦으면 오류를 표시하고 요청하지 않는다", async ({ page }) => {
    const concert = await createConcert(page, "E2E 회차 시간 범위");
    let createCount = 0;

    page.on("request", (request) => {
      if (request.url().endsWith("/api/performances") && request.method() === "POST") {
        createCount += 1;
      }
    });

    try {
      await page.goto(`/concerts/${concert.id}/performances/new`);
      await page.getByRole("button", { name: "공연 회차 추가" }).click();
      await fillPerformanceForm(page, {
        name: "시간 역전 회차",
        startsAt: STARTS_AT,
        bookingOpensAt: "2099-01-21T10:00",
      });
      await page.getByRole("button", { name: "등록", exact: true }).click();

      await expect(page.getByText("예매 시작 시각은 공연 시작 시각보다 이전이어야 합니다.")).toBeVisible();
      expect(createCount).toBe(0);
    } finally {
      await deleteConcert(page, concert.id);
    }
  });

  test("동일 콘서트의 동일 시작 시각은 중복 등록할 수 없다", async ({ page }) => {
    const concert = await createConcert(page, "E2E 중복 회차");
    const existingPerformance = await createPerformance(page, {
      concertId: concert.id,
      name: "기존 회차",
      startsAt: STARTS_AT,
      bookingOpensAt: BOOKING_OPENS_AT,
    });

    try {
      await page.goto(`/concerts/${concert.id}/performances/new`);
      await page.getByRole("button", { name: "공연 회차 추가" }).click();
      await fillPerformanceForm(page, {
        name: "중복 회차",
        startsAt: STARTS_AT,
        bookingOpensAt: BOOKING_OPENS_AT,
      });

      const responsePromise = page.waitForResponse(
        (response) => response.url().endsWith("/api/performances") && response.request().method() === "POST",
      );
      await page.getByRole("button", { name: "등록", exact: true }).click();
      const response = await responsePromise;

      expect(response.status()).toBe(409);
      await expect(response.json()).resolves.toMatchObject({
        success: false,
        error: { code: 409 },
      });
      await expect(page.getByRole("alert")).toHaveText("공연 회차 저장 중 오류가 발생했습니다.");
      await expect(page.getByLabel("공연 회차명")).toHaveValue("중복 회차");
    } finally {
      await deletePerformance(page, existingPerformance.id);
      await deleteConcert(page, concert.id);
    }
  });
});

test.describe("공연 회차 등록 권한 검증", () => {
  test("일반 사용자는 공연 회차 등록 페이지에 접근할 수 없다", async ({ page }) => {
    await authenticatePage(page, "USER");

    await page.goto(`/concerts/${E2E_SEED_CONCERTS.withoutPerformance.id}/performances/new`);

    await expect(page).toHaveURL("/");
  });

  test("화면 진입 뒤 권한이 사라지면 403 응답을 표시하고 입력값을 유지한다", async ({ page }) => {
    await authenticatePage(page, "ADMIN");
    const concert = await createConcert(page, "E2E 회차 권한 거부");

    try {
      await page.goto(`/concerts/${concert.id}/performances/new`);
      await page.getByRole("button", { name: "공연 회차 추가" }).click();
      await fillPerformanceForm(page, {
        name: "권한 거부 회차",
        startsAt: STARTS_AT,
        bookingOpensAt: BOOKING_OPENS_AT,
      });
      await setApiRole(page, "USER");

      const responsePromise = page.waitForResponse(
        (response) => response.url().endsWith("/api/performances") && response.request().method() === "POST",
      );
      await page.getByRole("button", { name: "등록", exact: true }).click();
      const response = await responsePromise;

      expect(response.status()).toBe(403);
      await expect(page.getByRole("alert")).toHaveText("공연 회차 저장 중 오류가 발생했습니다.");
      await expect(page.getByLabel("공연 회차명")).toHaveValue("권한 거부 회차");
      await expect(page).toHaveURL(`/concerts/${concert.id}/performances/new`);
    } finally {
      await deleteConcert(page, concert.id);
    }
  });
});
