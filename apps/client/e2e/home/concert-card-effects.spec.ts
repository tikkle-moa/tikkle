import { expect, test } from "@playwright/test";

test.describe("ConcertCard 호버 효과", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await expect(page.getByTestId("upcoming-concert-section")).toBeVisible();
  });

  test("카드 hover 시 확대되고 마우스가 떠나면 원래 크기로 돌아간다", async ({ page }) => {
    const card = page.getByTestId("upcoming-concert-section").getByTestId("concert-card").first();
    const transformTarget = card.getByTestId("concert-card-transform");

    await card.hover();
    await expect.poll(() => transformTarget.evaluate((el) => el.style.transform)).toContain("scale(1.02)");

    await page.mouse.move(0, 0);
    await expect.poll(() => transformTarget.evaluate((el) => el.style.transform)).not.toContain("scale(1.02)");
  });

  test("카드 hover 시 glare가 나타나고 마우스가 떠나면 제거된다", async ({ page }) => {
    const card = page.getByTestId("upcoming-concert-section").getByTestId("concert-card").first();
    const glare = card.getByTestId("concert-card-glare");

    await card.hover();
    await expect(glare).toBeVisible();

    await page.mouse.move(0, 0);
    await expect(glare).not.toBeAttached();
  });

  test("카드 위에서 마우스를 움직이면 tilt가 적용되고 떠나면 초기화된다", async ({ page }) => {
    const card = page.getByTestId("upcoming-concert-section").getByTestId("concert-card").first();
    const transformTarget = card.getByTestId("concert-card-transform");

    await card.hover();
    const box = await card.boundingBox();
    if (!box) {
      throw new Error("ConcertCard의 bounding box를 가져올 수 없습니다.");
    }

    await page.mouse.move(box.x + box.width * 0.9, box.y + box.height * 0.2, { steps: 5 });
    await expect.poll(() => transformTarget.evaluate((el) => el.style.transform)).not.toContain("rotateX(0deg) rotateY(0deg)");

    await page.mouse.move(0, 0);
    await expect.poll(() => transformTarget.evaluate((el) => el.style.transform)).toContain("rotateX(0deg) rotateY(0deg)");
  });

  test("카드 hover 시 shadow가 강조되고 떠나면 기본값으로 돌아간다", async ({ page }) => {
    const card = page.getByTestId("upcoming-concert-section").getByTestId("concert-card").first();
    const transformTarget = card.getByTestId("concert-card-transform");

    const defaultShadow = await transformTarget.evaluate((el) => el.style.boxShadow);

    await card.hover();
    await expect.poll(() => transformTarget.evaluate((el) => el.style.boxShadow)).not.toBe(defaultShadow);

    await page.mouse.move(0, 0);
    await expect.poll(() => transformTarget.evaluate((el) => el.style.boxShadow)).toBe(defaultShadow);
  });
});

test.describe("DailyRanking 카드 효과 비활성화", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await expect(page.getByTestId("daily-ranking-section")).toBeVisible();
  });

  test("DailyRanking 카드에서는 hover 효과가 적용되지 않는다", async ({ page }) => {
    const card = page.getByTestId("daily-ranking-section").getByTestId("concert-card").first();
    await expect(card).toBeVisible();

    const transformTarget = card.getByTestId("concert-card-transform");
    await card.hover();

    const transform = await transformTarget.evaluate((el) => el.style.transform);
    expect(transform).not.toContain("rotateX(");
    expect(transform).not.toContain("rotateY(");
    expect(transform).not.toContain("scale(1.02)");
    await expect(card.getByTestId("concert-card-glare")).not.toBeAttached();
    expect(await transformTarget.evaluate((el) => el.style.boxShadow)).toBe("none");
  });
});
