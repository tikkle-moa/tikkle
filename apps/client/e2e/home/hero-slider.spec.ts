import type { Page } from "@playwright/test";
import { expect, test } from "@playwright/test";

const getIndicator = (page: Page) => page.locator(".absolute.right-3.bottom-2").locator("span").first();

test.describe("Hero 슬라이더", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("슬라이드 컨트롤 버튼이 표시된다", async ({ page }) => {
    await expect(page.getByRole("button", { name: "이전 슬라이드" })).toBeVisible();
    await expect(page.getByRole("button", { name: "다음 슬라이드" })).toBeVisible();
    await expect(page.getByRole("button", { name: /자동 재생/ })).toBeVisible();
  });

  test("다음 버튼을 누르면 슬라이드가 변경된다", async ({ page }) => {
    await expect(getIndicator(page)).toContainText("01 /");
    await page.getByRole("button", { name: "다음 슬라이드" }).click();
    await expect(getIndicator(page)).toContainText("02");
  });

  test("이전 버튼을 누르면 슬라이드가 변경된다", async ({ page }) => {
    await expect(getIndicator(page)).toContainText("01 /");
    await page.getByRole("button", { name: "이전 슬라이드" }).click();
    await expect(getIndicator(page)).not.toContainText("01 /");
  });

  test("자동 재생을 일시정지하고 다시 시작할 수 있다", async ({ page }) => {
    const pauseButton = page.getByRole("button", { name: "자동 재생 일시정지" });
    await expect(pauseButton).toBeVisible();

    await pauseButton.click();
    await expect(page.getByRole("button", { name: "자동 재생 시작" })).toBeVisible();

    await page.getByRole("button", { name: "자동 재생 시작" }).click();
    await expect(page.getByRole("button", { name: "자동 재생 일시정지" })).toBeVisible();
  });
});
