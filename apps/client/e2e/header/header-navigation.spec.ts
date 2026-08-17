import { expect, test } from "@playwright/test";

test.describe("비로그인 데스크톱 헤더 탐색", () => {
  test.beforeEach(async ({ page }) => {
    await page.route("**/api/auth/me", (route) => route.fulfill({ status: 401 }));
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/");
  });

  test("로고와 데스크톱 메뉴로 주요 화면을 탐색한다", async ({ page }) => {
    const secondaryNavigation = page.getByRole("navigation", {
      name: "데스크톱 보조 메뉴",
    });

    await expect(page.getByRole("link", { name: "로그인" })).toBeVisible();
    await expect(page.getByRole("searchbox", { name: "공연 검색" })).toBeVisible();
    await expect(secondaryNavigation).toBeVisible();

    await secondaryNavigation.getByRole("link", { name: "콘서트", exact: true }).click();
    await expect(page).toHaveURL("/concerts");

    await page.getByRole("link", { name: "Tikkle 홈으로 이동" }).click();
    await expect(page).toHaveURL("/");
  });

  test("본문을 스크롤해도 헤더는 상단에 유지된다", async ({ page }) => {
    const header = page.locator("header");
    const main = page.locator("main").first();
    const headerBox = await header.boundingBox();

    await main.evaluate((element) => {
      element.scrollTop = element.scrollHeight;
    });

    await expect(header).toBeVisible();
    expect((await header.boundingBox())?.y).toBe(headerBox?.y ?? 0);
  });
});

const AUTHENTICATED_USER = {
  id: 1,
  email: "e2e@example.com",
  nickname: "E2E 사용자",
  profileImageUrl: null,
  role: "USER",
  oauthAccounts: ["google"],
};

test.describe("로그인 데스크톱 사용자 메뉴", () => {
  test.beforeEach(async ({ page }) => {
    await page.route("**/api/auth/me", (route) =>
      route.fulfill({
        json: {
          success: true,
          data: AUTHENTICATED_USER,
        },
      }),
    );
    await page.route("**/api/auth/logout", (route) =>
      route.fulfill({
        json: { success: true },
      }),
    );
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/");
  });

  test("사용자 메뉴에서 내 예약과 관심 화면으로 이동한다", async ({ page }) => {
    const userMenuButton = page.getByRole("button", {
      name: AUTHENTICATED_USER.nickname,
    });

    await userMenuButton.click();
    await expect(page.getByRole("link", { name: "내 예약", exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "관심", exact: true })).toBeVisible();

    await page.getByRole("link", { name: "내 예약", exact: true }).click();
    await expect(page).toHaveURL("/my/reservations");
    await expect(page.getByRole("heading", { name: "내 예약" })).toBeVisible();

    await page.getByRole("link", { name: "Tikkle 홈으로 이동" }).click();
    await userMenuButton.click();
    await page.getByRole("link", { name: "관심", exact: true }).click();

    await expect(page).toHaveURL("/my/favorites");
    await expect(page.getByRole("heading", { name: "관심" })).toBeVisible();
  });

  test("보호 화면에서 로그아웃하면 홈으로 이동하고 비로그인 메뉴를 표시한다", async ({ page }) => {
    await page.goto("/my/reservations");

    await page.getByRole("button", { name: AUTHENTICATED_USER.nickname }).click();
    await page.getByRole("button", { name: "로그아웃" }).click();

    await expect(page).toHaveURL("/");
    await expect(page.getByRole("link", { name: "로그인" })).toBeVisible();
    await expect(page.getByRole("button", { name: AUTHENTICATED_USER.nickname })).not.toBeVisible();
  });
});
