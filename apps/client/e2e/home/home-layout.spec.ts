import { expect, test } from "@playwright/test";

import { VIEWPORT_CONFIG } from "../config/viewport.config";

const MOBILE_CARD_WIDTH = 160;
const DESKTOP_CARD_WIDTH = 240;
const WIDTH_TOLERANCE = 4;

test.describe("홈 페이지 반응형 레이아웃", () => {
  test("홈 페이지의 주요 섹션이 모두 표시된다", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByTestId("upcoming-concert-section")).toBeVisible();
    await expect(page.getByTestId("daily-ranking-section")).toBeVisible();
    await expect(page.getByTestId("hot-concert-section")).toBeVisible();
  });

  test("데스크톱에서 HotConcert가 3열로 표시된다", async ({ page }) => {
    await page.setViewportSize(VIEWPORT_CONFIG.DESKTOP);
    await page.goto("/");

    const grid = page.getByTestId("hot-concert-section").getByTestId("hot-concert-grid");
    await expect(grid).toBeVisible();

    const columnCount = await grid.evaluate((element) => {
      const columns = window.getComputedStyle(element).gridTemplateColumns.trim().split(/\s+/);
      return columns.length;
    });
    expect(columnCount).toBe(3);
  });

  test("모바일에서 HotConcert가 2열로 표시된다", async ({ page }) => {
    await page.setViewportSize(VIEWPORT_CONFIG.MOBILE);
    await page.goto("/");

    const grid = page.getByTestId("hot-concert-section").getByTestId("hot-concert-grid");
    await expect(grid).toBeVisible();

    const columnCount = await grid.evaluate((element) => {
      const columns = window.getComputedStyle(element).gridTemplateColumns.trim().split(/\s+/);
      return columns.length;
    });
    expect(columnCount).toBe(2);
  });

  test("모바일에서 UpcomingConcert 콘텐츠를 가로 스크롤할 수 있다", async ({ page }) => {
    await page.setViewportSize(VIEWPORT_CONFIG.MOBILE);
    await page.goto("/");

    const scrollContainer = page.getByTestId("upcoming-concert-section").getByTestId("upcoming-concert-scroll");
    await expect(scrollContainer).toBeVisible();

    const { clientWidth, scrollWidth, scrollLeft } = await scrollContainer.evaluate((element) => ({
      clientWidth: element.clientWidth,
      scrollWidth: element.scrollWidth,
      scrollLeft: element.scrollLeft,
    }));
    expect(scrollWidth).toBeGreaterThan(clientWidth);

    await scrollContainer.evaluate((element) => {
      element.scrollLeft = 100;
    });
    await expect.poll(() => scrollContainer.evaluate((element) => element.scrollLeft)).toBeGreaterThan(scrollLeft);
  });

  test("모바일에서 UpcomingConcert 카드 너비가 160px이다", async ({ page }) => {
    await page.setViewportSize(VIEWPORT_CONFIG.MOBILE);
    await page.goto("/");

    const card = page.getByTestId("upcoming-concert-section").getByTestId("concert-card").first();
    await expect(card).toBeVisible();

    const box = await card.boundingBox();
    if (!box) {
      throw new Error("UpcomingConcert ConcertCard의 bounding box를 가져올 수 없습니다.");
    }

    expect(box.width).toBeGreaterThanOrEqual(MOBILE_CARD_WIDTH - WIDTH_TOLERANCE);
    expect(box.width).toBeLessThanOrEqual(MOBILE_CARD_WIDTH + WIDTH_TOLERANCE);
  });

  test("데스크톱에서 UpcomingConcert 카드 너비가 240px이다", async ({ page }) => {
    await page.setViewportSize(VIEWPORT_CONFIG.DESKTOP);
    await page.goto("/");

    const card = page.getByTestId("upcoming-concert-section").getByTestId("concert-card").first();
    await expect(card).toBeVisible();

    const box = await card.boundingBox();
    if (!box) {
      throw new Error("UpcomingConcert ConcertCard의 bounding box를 가져올 수 없습니다.");
    }

    expect(box.width).toBeGreaterThanOrEqual(DESKTOP_CARD_WIDTH - WIDTH_TOLERANCE);
    expect(box.width).toBeLessThanOrEqual(DESKTOP_CARD_WIDTH + WIDTH_TOLERANCE);
  });

  test("모바일에서 Hero 슬라이드가 16:10 비율에 가깝게 표시된다", async ({ page }) => {
    await page.setViewportSize(VIEWPORT_CONFIG.MOBILE);
    await page.goto("/");

    const slide = page.locator(".swiper-slide").first();
    await expect(slide).toBeVisible();

    const box = await slide.boundingBox();
    if (!box) {
      throw new Error("Hero 슬라이드의 bounding box를 가져올 수 없습니다.");
    }

    const aspectRatio = box.width / box.height;
    expect(aspectRatio).toBeGreaterThan(1.55);
    expect(aspectRatio).toBeLessThan(1.65);
  });

  test("데스크톱에서 Hero 슬라이드가 16:6 비율에 가깝게 표시된다", async ({ page }) => {
    await page.setViewportSize(VIEWPORT_CONFIG.DESKTOP);
    await page.goto("/");

    const slide = page.locator(".swiper-slide").first();
    await expect(slide).toBeVisible();

    const box = await slide.boundingBox();
    if (!box) {
      throw new Error("Hero 슬라이드의 bounding box를 가져올 수 없습니다.");
    }

    const aspectRatio = box.width / box.height;
    expect(aspectRatio).toBeGreaterThan(2.55);
    expect(aspectRatio).toBeLessThan(2.75);
  });
});
