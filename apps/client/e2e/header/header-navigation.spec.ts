import { expect, test } from "@playwright/test";

const AUTHENTICATED_USER = {
  id: 1,
  email: "e2e@example.com",
  nickname: "E2E 사용자",
  profileImageUrl: null,
  role: "USER",
  oauthAccounts: ["google"],
};

const MOBILE_VIEWPORT = { width: 767, height: 800 };
const DESKTOP_VIEWPORT = { width: 768, height: 800 };

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

test.describe("로그인 모바일 헤더와 마이 화면", () => {
  test.beforeEach(async ({ page }) => {
    await page.route("**/api/auth/me", (route) =>
      route.fulfill({
        json: {
          success: true,
          data: AUTHENTICATED_USER,
        },
      }),
    );
    await page.setViewportSize(MOBILE_VIEWPORT);
    await page.goto("/");
  });

  test("헤더 프로필 링크로 마이 화면으로 이동한다", async ({ page }) => {
    await page
      .getByRole("link", {
        name: `${AUTHENTICATED_USER.nickname} 마이 페이지로 이동`,
      })
      .click();

    await expect(page).toHaveURL("/my");
    await expect(page.getByText(`${AUTHENTICATED_USER.nickname}님, 반가워요`)).toBeVisible();
  });

  test("하단 내비게이션으로 마이 화면에 접근한다", async ({ page }) => {
    const mobileNavigation = page.getByRole("navigation", {
      name: "모바일 주요 메뉴",
    });

    await expect(mobileNavigation).toBeVisible();

    await mobileNavigation.getByRole("link", { name: "마이", exact: true }).click();

    await expect(page).toHaveURL("/my");
    await expect(page.getByText(`${AUTHENTICATED_USER.nickname}님, 반가워요`)).toBeVisible();
    await expect(page.getByRole("link", { name: /내 예약/ })).toBeVisible();
    await expect(page.getByRole("link", { name: /관심/ })).toBeVisible();
    await expect(page.getByRole("button", { name: "로그아웃" })).toBeVisible();
    await expect(mobileNavigation.getByRole("link", { name: "마이", exact: true })).toHaveAttribute("aria-current", "page");
  });
});

test.describe("로그인 사용자 헤더 반응형 전환", () => {
  for (const [viewportName, viewport, isMobile] of [
    ["MD 직전", MOBILE_VIEWPORT, true],
    ["MD 경계", DESKTOP_VIEWPORT, false],
  ] as const) {
    test(`${viewportName}에서 알맞은 헤더 메뉴를 표시한다`, async ({ page }) => {
      await page.route("**/api/auth/me", (route) =>
        route.fulfill({
          json: {
            success: true,
            data: AUTHENTICATED_USER,
          },
        }),
      );
      await page.setViewportSize(viewport);
      await page.goto("/");

      const profileLink = page.getByRole("link", {
        name: `${AUTHENTICATED_USER.nickname} 마이 페이지로 이동`,
      });
      const userMenuButton = page.getByRole("button", {
        name: AUTHENTICATED_USER.nickname,
      });
      const mobileNavigation = page.getByRole("navigation", {
        name: "모바일 주요 메뉴",
      });

      if (isMobile) {
        await expect(profileLink).toBeVisible();
        await expect(mobileNavigation).toBeVisible();
        await expect(userMenuButton).toHaveCount(0);
        await expect(page.getByRole("searchbox", { name: "공연 검색" })).toHaveCount(0);
        return;
      }

      await expect(profileLink).toHaveCount(0);
      await expect(mobileNavigation).toHaveCount(0);
      await expect(userMenuButton).toBeVisible();
      await expect(page.getByRole("searchbox", { name: "공연 검색" })).toBeVisible();
    });
  }
});

test.describe("비로그인 모바일 마이 접근", () => {
  test.beforeEach(async ({ page }) => {
    await page.route("**/api/auth/me", (route) =>
      route.fulfill({
        json: {
          success: false,
          data: null,
        },
      }),
    );
    await page.setViewportSize(MOBILE_VIEWPORT);
    await page.goto("/");
  });

  test("마이 화면에서 로그인을 유도하고 보호 경로는 로그인 화면으로 이동한다", async ({ page }) => {
    const mobileNavigation = page.getByRole("navigation", {
      name: "모바일 주요 메뉴",
    });

    await expect(page.getByRole("link", { name: "로그인", exact: true })).toBeVisible();

    await mobileNavigation.getByRole("link", { name: "마이", exact: true }).click();

    await expect(page).toHaveURL("/my");
    await expect(page.getByText("로그인하여 원하는 공연을 찾아보세요")).toBeVisible();

    await page.getByRole("link", { name: "로그인하고 공연 찾아보기" }).click();

    await expect(page).toHaveURL("/login");
    await expect(page.getByRole("heading", { name: "함께 고르고, 함께 예매하세요." })).toBeVisible();

    await page.goto("/my/reservations");

    await expect(page).toHaveURL("/login");
  });
});
