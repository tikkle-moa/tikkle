import { expect, test } from "@playwright/test";

import { mockOAuthSession } from "../api/auth.api";

const CONCERT_WITHOUT_PERFORMANCE = {
  id: 900001,
  title: "E2E 회차 없는 콘서트",
};

test.describe("콘서트 상세", () => {
  test("일반 사용자에게 콘서트 수정 버튼을 표시하지 않는다", async ({ page }) => {
    await mockOAuthSession(page, "USER");

    await page.goto(`/concerts/${CONCERT_WITHOUT_PERFORMANCE.id}`);

    await expect(page.getByRole("link", { name: `${CONCERT_WITHOUT_PERFORMANCE.title} 수정` })).toHaveCount(0);
  });

  test("비로그인 사용자에게 콘서트 수정 버튼을 표시하지 않는다", async ({ page }) => {
    await page.goto(`/concerts/${CONCERT_WITHOUT_PERFORMANCE.id}`);

    await expect(page.getByRole("link", { name: `${CONCERT_WITHOUT_PERFORMANCE.title} 수정` })).toHaveCount(0);
  });

  test("회차가 없는 콘서트의 안내와 관리자 수정 버튼을 표시한다", async ({ page }) => {
    await mockOAuthSession(page, "ADMIN");
    await page.goto(`/concerts/${CONCERT_WITHOUT_PERFORMANCE.id}`);

    await expect(page.getByRole("heading", { name: CONCERT_WITHOUT_PERFORMANCE.title })).toBeVisible();
    await expect(page.getByText("회차 준비 중", { exact: true })).toBeVisible();
    await expect(page.getByText("예매 회차를 준비 중입니다", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "좌석 선택하기" })).toBeDisabled();

    await expect(page.getByRole("link", { name: `${CONCERT_WITHOUT_PERFORMANCE.title} 수정` })).toHaveAttribute(
      "href",
      `/concerts/${CONCERT_WITHOUT_PERFORMANCE.id}/edit`,
    );
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
