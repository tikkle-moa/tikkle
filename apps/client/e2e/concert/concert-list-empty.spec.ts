import { expect, test } from "@playwright/test";

const ADMIN_USER = {
  id: 1,
  email: "admin@example.com",
  nickname: "관리자",
  profileImageUrl: null,
  role: "ADMIN",
  oauthAccounts: ["google"],
};

test.describe("빈 콘서트 목록", () => {
  test.beforeEach(async ({ page }) => {
    await page.route("**/api/auth/me", (route) =>
      route.fulfill({
        json: {
          success: true,
          data: ADMIN_USER,
        },
      }),
    );

    await page.route("**/api/concerts", (route) =>
      route.fulfill({
        json: {
          success: true,
          data: [],
        },
      }),
    );
  });

  test("빈 목록 안내와 관리자 등록 버튼을 표시한다", async ({ page }) => {
    await page.goto("/concerts");

    await expect(page.getByRole("heading", { name: "공연 목록" })).toBeVisible();
    await expect(page.getByText("등록된 공연이 없습니다.")).toBeVisible();
    await expect(page.getByTestId("concert-list-grid")).toHaveCount(0);

    await expect(page.getByRole("link", { name: "콘서트 등록" })).toHaveAttribute("href", "/concerts/new");
  });
});
