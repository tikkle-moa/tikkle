import { type Page, expect, test } from "@playwright/test";

import { authenticatePage, createApiAuthHeaders, mockOAuthSession } from "../api/auth.api";
import { createConcert, deleteConcert } from "../api/concert.api";
import { E2E_SEED_CONCERTS } from "../config/e2e-seed-data.config";

const deletePerformance = async (page: Page, performanceId: number) => {
  const response = await page.request.delete(`/api/performances/${performanceId}`, {
    headers: createApiAuthHeaders("ADMIN"),
  });

  if (response.status() === 404) return;

  expect(response.ok(), await response.text()).toBe(true);
};

test.describe("콘서트 상세", () => {
  test("일반 사용자에게 콘서트 수정 버튼을 표시하지 않는다", async ({ page }) => {
    await mockOAuthSession(page, "USER");

    await page.goto(`/concerts/${E2E_SEED_CONCERTS.withoutPerformance.id}`);

    await expect(page.getByRole("link", { name: `${E2E_SEED_CONCERTS.withoutPerformance.title} 수정` })).toHaveCount(0);
  });

  test("비로그인 사용자에게 콘서트 수정 버튼을 표시하지 않는다", async ({ page }) => {
    await page.goto(`/concerts/${E2E_SEED_CONCERTS.withoutPerformance.id}`);

    await expect(page.getByRole("link", { name: `${E2E_SEED_CONCERTS.withoutPerformance.title} 수정` })).toHaveCount(0);
  });

  test("회차가 없는 콘서트의 안내와 관리자 수정 버튼을 표시한다", async ({ page }) => {
    await mockOAuthSession(page, "ADMIN");
    await page.goto(`/concerts/${E2E_SEED_CONCERTS.withoutPerformance.id}`);

    await expect(page.getByRole("heading", { name: E2E_SEED_CONCERTS.withoutPerformance.title })).toBeVisible();
    await expect(page.getByText("회차 준비 중", { exact: true })).toBeVisible();
    await expect(page.getByText("총 0회", { exact: true })).toBeVisible();
    await expect(page.getByText("등록된 공연 회차가 없습니다", { exact: true })).toBeVisible();
    await expect(page.getByRole("list", { name: "공연 회차 목록" })).toHaveCount(0);

    await expect(page.getByRole("link", { name: `${E2E_SEED_CONCERTS.withoutPerformance.title} 수정` })).toHaveAttribute(
      "href",
      `/concerts/${E2E_SEED_CONCERTS.withoutPerformance.id}/edit`,
    );
  });

  test("존재하지 않는 콘서트에 접근하면 404 응답과 오류 안내를 표시한다", async ({ page }) => {
    const missingId = 2_147_483_647;
    const responsePromise = page.waitForResponse(
      (response) => response.url().endsWith(`/api/concerts/${missingId}`) && response.request().method() === "GET",
    );

    await page.goto(`/concerts/${missingId}`);
    const response = await responsePromise;

    expect(response.status()).toBe(404);
    await expect(page.getByRole("heading", { name: "공연 정보를 불러오지 못했습니다." })).toBeVisible();
    await expect(page.getByText("잠시 후 다시 시도해 주세요.")).toBeVisible();
  });

  for (const concertId of ["not-a-number", "0", "-1"]) {
    test(`유효하지 않은 콘서트 ID(${concertId})면 안내를 표시한다`, async ({ page }) => {
      let detailRequestCount = 0;

      page.on("request", (request) => {
        if (/\/api\/concerts\/[^/]+$/.test(new URL(request.url()).pathname)) {
          detailRequestCount += 1;
        }
      });

      await page.goto(`/concerts/${concertId}`);

      await expect(page.getByRole("heading", { name: "잘못된 공연입니다." })).toBeVisible();
      await expect(page.getByText("올바르지 않은 콘서트 ID입니다.")).toBeVisible();
      expect(detailRequestCount).toBe(0);
    });
  }
});

test.describe("콘서트 상세 예매 패널 회차 관리", () => {
  test("관리자가 예매 패널에서 회차를 생성·수정·삭제한다", async ({ page }) => {
    await authenticatePage(page, "ADMIN");
    const concert = await createConcert(page, "E2E 예매 패널 회차 관리");
    let performanceId: number | undefined;

    try {
      await page.goto(`/concerts/${concert.id}`);

      await expect(page.getByText("등록된 공연 회차가 없습니다", { exact: true })).toBeVisible();

      await page.getByRole("button", { name: "공연 회차 추가" }).click();
      await page.getByLabel("공연 회차명").fill("패널 첫 회차");
      await page.getByLabel("공연 시작 시각").fill("2099-01-20T19:00");
      await page.getByLabel("예매 시작 시각").fill("2099-01-10T10:00");

      const createResponsePromise = page.waitForResponse(
        (response) => response.url().endsWith("/api/performances") && response.request().method() === "POST",
      );
      await page.getByRole("button", { name: "등록", exact: true }).click();
      const createResponse = await createResponsePromise;
      const createBody = await createResponse.json();

      expect(createResponse.status()).toBe(201);
      expect(createBody).toMatchObject({
        success: true,
        data: {
          concertId: concert.id,
          name: "패널 첫 회차",
        },
      });
      performanceId = createBody.data.id;

      await expect(page.getByRole("list", { name: "공연 회차 목록" })).toContainText("패널 첫 회차");
      await expect(page.getByRole("link", { name: "패널 첫 회차 상세 보기" })).toHaveAttribute("href", `/performances/${performanceId}`);

      await page.getByRole("button", { name: "공연 회차 수정" }).click();
      await page.getByLabel("공연 회차명").fill("패널 수정 회차");

      const updateResponsePromise = page.waitForResponse(
        (response) => response.url().endsWith(`/api/performances/${performanceId}`) && response.request().method() === "PATCH",
      );
      await page.getByRole("button", { name: "저장", exact: true }).click();
      const updateResponse = await updateResponsePromise;

      expect(updateResponse.status()).toBe(200);
      await expect(page.getByRole("list", { name: "공연 회차 목록" })).toContainText("패널 수정 회차");
      await expect(page.getByRole("link", { name: "패널 수정 회차 상세 보기" })).toHaveAttribute("href", `/performances/${performanceId}`);

      page.once("dialog", (dialog) => dialog.accept());

      const deleteResponsePromise = page.waitForResponse(
        (response) => response.url().endsWith(`/api/performances/${performanceId}`) && response.request().method() === "DELETE",
      );
      await page.getByRole("button", { name: "공연 회차 삭제" }).click();
      const deleteResponse = await deleteResponsePromise;

      expect(deleteResponse.status()).toBe(200);
      performanceId = undefined;

      await expect(page.getByText("등록된 공연 회차가 없습니다", { exact: true })).toBeVisible();
      await expect(page.getByRole("list", { name: "공연 회차 목록" })).toHaveCount(0);
    } finally {
      if (performanceId) {
        await deletePerformance(page, performanceId);
      }
      await deleteConcert(page, concert.id);
    }
  });
});

test.describe("콘서트 상세 예매 패널 권한", () => {
  test("일반 사용자에게 회차 관리 버튼을 표시하지 않는다", async ({ page }) => {
    await mockOAuthSession(page, "USER");

    await page.goto(`/concerts/${E2E_SEED_CONCERTS.normal.id}`);

    await expect(page.getByRole("list", { name: "공연 회차 목록" })).toBeVisible();
    await expect(page.getByRole("button", { name: "공연 회차 추가" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "공연 회차 수정" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "공연 회차 삭제" })).toHaveCount(0);
  });

  test("비로그인 사용자에게 회차 관리 버튼을 표시하지 않는다", async ({ page }) => {
    await page.goto(`/concerts/${E2E_SEED_CONCERTS.normal.id}`);

    await expect(page.getByRole("list", { name: "공연 회차 목록" })).toBeVisible();
    await expect(page.getByRole("button", { name: "공연 회차 추가" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "공연 회차 수정" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "공연 회차 삭제" })).toHaveCount(0);
  });
});
