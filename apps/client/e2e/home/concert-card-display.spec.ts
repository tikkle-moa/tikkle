import { expect, test } from "@playwright/test";

const STATUS_REGEX = /예매 중|매진|오픈 예정|공연 종료/;

test.describe("ConcertCard 표시 정보 및 상태 UI", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("HotConcert 카드에 상태, 장르, 제목이 표시된다", async ({ page }) => {
    const section = page.getByTestId("hot-concert-section");
    const card = section.getByTestId("concert-card").first();
    await expect(card).toBeVisible();

    await expect(card.locator("span").filter({ hasText: STATUS_REGEX })).toBeVisible();
    await expect(card.locator("[class*='backdrop-blur-sm']")).toBeVisible();

    const title = section.locator("p.font-bold").first();
    await expect(title).toBeVisible();
    expect((await title.textContent())?.trim().length).toBeGreaterThan(0);
  });

  test("UpcomingConcert 카드에 장르, 제목, 장소가 표시된다", async ({ page }) => {
    const section = page.getByTestId("upcoming-concert-section");
    const card = section.getByTestId("concert-card").first();
    await expect(card).toBeVisible();

    await expect(card.locator("[class*='backdrop-blur-sm']")).toBeVisible();
    const title = section.locator("p.font-bold").first();
    await expect(title).toBeVisible();
    expect((await title.textContent())?.trim().length).toBeGreaterThan(0);

    const placeText = section.locator("p.text-gray-500").first();
    await expect(placeText).toBeVisible();
    expect((await placeText.textContent())?.trim().length).toBeGreaterThan(0);
  });

  test("DailyRanking 항목에 순위, 제목, 상태가 표시된다", async ({ page }) => {
    await expect(page.getByTestId("daily-ranking-section")).toBeVisible();
    const firstItem = page.getByTestId("daily-ranking-section").locator("article").first();
    await expect(firstItem).toBeVisible();

    await expect(firstItem.locator("span").first()).toContainText("1");
    const title = firstItem.locator("h3");
    await expect(title).toBeVisible();
    expect((await title.textContent())?.trim().length).toBeGreaterThan(0);
    await expect(firstItem.locator("span").filter({ hasText: STATUS_REGEX })).toBeVisible();
  });
});
