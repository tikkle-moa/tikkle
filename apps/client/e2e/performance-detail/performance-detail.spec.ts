import { expect, test } from "@playwright/test";

const NORMAL_PERFORMANCE = {
  id: 900000,
  concertId: 900000,
  name: "E2E 정상 콘서트 1회차",
};

const ENDED_PERFORMANCE = {
  id: 900001,
  name: "E2E 종료 회차",
};

test.describe("공연 회차 상세", () => {
  test("정상 회차에 접근하면 공연 정보와 좌석 배치를 표시한다", async ({ page }) => {
    const responsePromise = page.waitForResponse(
      (response) => response.url().endsWith(`/api/performances/${NORMAL_PERFORMANCE.id}`) && response.request().method() === "GET",
    );

    await page.goto(`/performances/${NORMAL_PERFORMANCE.id}`);
    const response = await responsePromise;

    expect(response.status()).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      success: true,
      data: {
        performance: {
          id: NORMAL_PERFORMANCE.id,
          concertId: NORMAL_PERFORMANCE.concertId,
          name: NORMAL_PERFORMANCE.name,
          status: "UPCOMING",
        },
        seats: [],
      },
    });
    await expect(page.getByRole("heading", { name: NORMAL_PERFORMANCE.name })).toBeVisible();
    await expect(page.getByText("오픈 예정", { exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "콘서트 상세로 돌아가기" })).toHaveAttribute("href", `/concerts/${NORMAL_PERFORMANCE.concertId}`);
    await expect(page.getByRole("heading", { name: "좌석 배치 정보" })).toBeVisible();
    await expect(page.getByText(`${NORMAL_PERFORMANCE.name} · 전체 0석`)).toBeVisible();
  });

  test("종료된 회차에 접근하면 상세 대신 종료 안내를 표시한다", async ({ page }) => {
    const responsePromise = page.waitForResponse(
      (response) => response.url().endsWith(`/api/performances/${ENDED_PERFORMANCE.id}`) && response.request().method() === "GET",
    );

    await page.goto(`/performances/${ENDED_PERFORMANCE.id}`);
    const response = await responsePromise;

    expect(response.status()).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      success: true,
      data: {
        performance: {
          id: ENDED_PERFORMANCE.id,
          name: ENDED_PERFORMANCE.name,
          status: "ENDED",
        },
      },
    });
    await expect(page.getByRole("heading", { name: "종료된 공연 회차입니다." })).toBeVisible();
    await expect(page.getByText("다른 회차를 선택해 주세요.")).toBeVisible();
    await expect(page.getByRole("heading", { name: ENDED_PERFORMANCE.name })).toHaveCount(0);
  });

  test("존재하지 않는 회차에 접근하면 404 응답과 오류 안내를 표시한다", async ({ page }) => {
    const missingId = 2_147_483_647;
    const responsePromise = page.waitForResponse(
      (response) => response.url().endsWith(`/api/performances/${missingId}`) && response.request().method() === "GET",
    );

    await page.goto(`/performances/${missingId}`);
    const response = await responsePromise;

    expect(response.status()).toBe(404);
    await expect(page.getByRole("heading", { name: "공연 회차를 불러오지 못했습니다." })).toBeVisible();
    await expect(page.getByText("잠시 후 다시 시도해 주세요.")).toBeVisible();
  });

  for (const performanceId of ["not-a-number", "0", "-1"]) {
    test(`유효하지 않은 공연 회차 ID(${performanceId})면 API 요청 없이 안내를 표시한다`, async ({ page }) => {
      let detailRequestCount = 0;

      page.on("request", (request) => {
        if (/\/api\/performances\/[^/]+$/.test(new URL(request.url()).pathname)) {
          detailRequestCount += 1;
        }
      });

      await page.goto(`/performances/${performanceId}`);

      await expect(page.getByRole("heading", { name: "잘못된 공연 회차입니다." })).toBeVisible();
      await expect(page.getByText("올바르지 않은 공연 회차 ID입니다.")).toBeVisible();
      expect(detailRequestCount).toBe(0);
    });
  }
});
