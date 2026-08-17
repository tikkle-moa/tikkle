import { expect, test } from "@playwright/test";

import { VIEWPORT_CONFIG, Viewport } from "../config/viewport.config";

const WIDTH_TOLERANCE = 4;
const ASPECT_RATIO_TOLERANCE = 0.1;

const VIEWPORT_UPCOMING_CONCERT_WIDTH: Record<Viewport, number> = {
  MOBILE: 160,
  SMALL_TABLET: 160,
  TABLET: 240,
  DESKTOP: 240,
};

const VIEWPORT_HOT_CONCERT_COLUMNS: Record<Viewport, number> = {
  MOBILE: 2,
  SMALL_TABLET: 3,
  TABLET: 3,
  DESKTOP: 3,
};

const VIEWPORT_HERO_SLIDE_ASPECT_RATIO: Record<Viewport, { width: number; height: number }> = {
  MOBILE: { width: 16, height: 10 },
  SMALL_TABLET: { width: 16, height: 7 },
  TABLET: { width: 16, height: 7 },
  DESKTOP: { width: 16, height: 6 },
};

test.describe("홈 페이지 반응형 레이아웃", () => {
  test("홈 페이지의 주요 섹션이 모두 표시된다", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByTestId("upcoming-concert-section")).toBeVisible();
    await expect(page.getByTestId("daily-ranking-section")).toBeVisible();
    await expect(page.getByTestId("hot-concert-section")).toBeVisible();
  });

  for (const [viewportKey, expectedCardWidth] of Object.entries(VIEWPORT_UPCOMING_CONCERT_WIDTH) as [Viewport, number][]) {
    const { label, width, height } = VIEWPORT_CONFIG[viewportKey];

    test(`${label}에서 UpcomingConcert 카드 너비가 ${expectedCardWidth}px이다`, async ({ page }) => {
      await page.setViewportSize({ width, height });
      await page.goto("/");

      const card = page.getByTestId("upcoming-concert-section").getByTestId("concert-card").first();
      await expect(card).toBeVisible();

      const box = await card.boundingBox();
      if (!box) {
        throw new Error("UpcomingConcert ConcertCard의 bounding box를 가져올 수 없습니다.");
      }

      expect(box.width).toBeGreaterThanOrEqual(expectedCardWidth - WIDTH_TOLERANCE);
      expect(box.width).toBeLessThanOrEqual(expectedCardWidth + WIDTH_TOLERANCE);
    });
  }

  for (const [viewportKey, expectedColumnCount] of Object.entries(VIEWPORT_HOT_CONCERT_COLUMNS) as [Viewport, number][]) {
    const { label, width, height } = VIEWPORT_CONFIG[viewportKey];

    test(`${label}에서 HotConcert가 ${expectedColumnCount}열로 표시된다`, async ({ page }) => {
      await page.setViewportSize({ width, height });
      await page.goto("/");

      const grid = page.getByTestId("hot-concert-section").getByTestId("hot-concert-grid");
      await expect(grid).toBeVisible();

      const columnCount = await grid.evaluate((element) => {
        const columns = window.getComputedStyle(element).gridTemplateColumns.trim().split(/\s+/);
        return columns.length;
      });
      expect(columnCount).toBe(expectedColumnCount);
    });
  }

  for (const [viewportKey, { width: expectedWidth, height: expectedHeight }] of Object.entries(VIEWPORT_HERO_SLIDE_ASPECT_RATIO) as [
    Viewport,
    { width: number; height: number },
  ][]) {
    const { label, width, height } = VIEWPORT_CONFIG[viewportKey];

    test(`${label}에서 Hero 슬라이드가 ${expectedWidth}:${expectedHeight} 비율에 가깝게 표시된다`, async ({ page }) => {
      await page.setViewportSize({ width, height });
      await page.goto("/");

      const slide = page.getByTestId("hero-content").getByTestId("content-slider").locator(".swiper-slide").first();
      await expect(slide).toBeVisible();

      const box = await slide.boundingBox();
      if (!box) {
        throw new Error("Hero 슬라이드의 bounding box를 가져올 수 없습니다.");
      }

      const aspectRatio = box.width / box.height;
      const expectedAspectRatio = expectedWidth / expectedHeight;
      expect(aspectRatio).toBeGreaterThan(expectedAspectRatio - ASPECT_RATIO_TOLERANCE);
      expect(aspectRatio).toBeLessThan(expectedAspectRatio + ASPECT_RATIO_TOLERANCE);
    });
  }
});
