import type { Locator, Page } from "@playwright/test";
import { expect, test } from "@playwright/test";

const getHeroSlider = (page: Page) => {
  return page.getByTestId("hero-content").getByTestId("content-slider");
};

const getSlideIndex = async (slideIndicator: Locator) => {
  const slideIndicatorText = await slideIndicator.textContent();
  if (!slideIndicatorText) {
    throw new Error("슬라이드 인덱스를 가져올 수 없습니다.");
  }
  const [currentIndex, totalSlides] = slideIndicatorText.split("/").map((str) => Number(str.trim()));
  if (isNaN(currentIndex) || isNaN(totalSlides)) {
    throw new Error("슬라이드 인덱스를 숫자로 변환할 수 없습니다.");
  }
  return { currentIndex, totalSlides };
};

test.describe("Hero 슬라이더", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("슬라이드 컨트롤 버튼이 표시된다", async ({ page }) => {
    const slider = getHeroSlider(page);

    await expect(slider.getByTestId("prev-slide-button")).toBeVisible();
    await expect(slider.getByTestId("next-slide-button")).toBeVisible();
    await expect(slider.getByTestId("autoplay-button")).toBeVisible();
  });

  test("다음 버튼을 누르면 슬라이드가 변경된다", async ({ page }) => {
    const slider = getHeroSlider(page);
    const activeSlide = slider.locator(".swiper-slide-active");
    const slideIndicator = slider.getByTestId("slide-indicator");

    const { currentIndex, totalSlides } = await getSlideIndex(slideIndicator);
    const currentContent = await activeSlide.innerHTML();

    const nextButton = slider.getByTestId("next-slide-button");
    await nextButton.click();

    await expect.poll(() => activeSlide.innerHTML(), { timeout: 5000 }).not.toBe(currentContent);
    const { currentIndex: newIndex, totalSlides: newTotalSlides } = await getSlideIndex(slideIndicator);
    expect(newTotalSlides).toBe(totalSlides);
    expect(newIndex).toBe((currentIndex % totalSlides) + 1);
  });

  test("이전 버튼을 누르면 슬라이드가 변경된다", async ({ page }) => {
    const slider = getHeroSlider(page);
    const activeSlide = slider.locator(".swiper-slide-active");
    const slideIndicator = slider.getByTestId("slide-indicator");

    const { currentIndex, totalSlides } = await getSlideIndex(slideIndicator);
    const currentContent = await activeSlide.innerHTML();

    const prevButton = slider.getByTestId("prev-slide-button");
    await prevButton.click();

    await expect.poll(() => activeSlide.innerHTML(), { timeout: 5000 }).not.toBe(currentContent);
    const { currentIndex: newIndex, totalSlides: newTotalSlides } = await getSlideIndex(slideIndicator);
    expect(newTotalSlides).toBe(totalSlides);
    expect(newIndex).toBe(((currentIndex - 2 + totalSlides) % totalSlides) + 1);
  });

  test("자동 재생을 일시정지하고 다시 시작할 수 있다", async ({ page }) => {
    const slider = getHeroSlider(page);
    const activeSlide = slider.locator(".swiper-slide-active");
    const autoplayButton = slider.getByTestId("autoplay-button");

    const autoplayLabel = await autoplayButton.getAttribute("aria-label");
    if (!autoplayLabel) {
      throw new Error("자동 재생 버튼의 aria-label을 가져올 수 없습니다.");
    }

    if (autoplayLabel.includes("정지")) {
      await autoplayButton.click();
    }
    const pausedContent = await activeSlide.innerHTML();
    await page.waitForTimeout(5000);
    expect(await activeSlide.innerHTML()).toBe(pausedContent);

    await autoplayButton.click();
    await expect.poll(() => activeSlide.innerHTML(), { timeout: 5000 }).not.toBe(pausedContent);
  });
});
