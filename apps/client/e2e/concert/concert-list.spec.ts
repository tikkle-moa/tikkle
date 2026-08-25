import { expect, test } from "@playwright/test";

const ADMIN_USER = {
  id: 1,
  email: "admin@example.com",
  nickname: "관리자",
  profileImageUrl: null,
  role: "ADMIN",
  oauthAccounts: ["google"],
};

const NORMAL_CONCERT = {
  id: 900000,
  title: "E2E 정상 콘서트",
};

test.describe("콘서트 목록", () => {
  test.beforeEach(async ({ page }) => {
    await page.route("**/api/auth/me", (route) =>
      route.fulfill({
        json: {
          success: true,
          data: ADMIN_USER,
        },
      }),
    );
  });

  test("콘서트 목록과 관리자 등록 버튼을 표시한다", async ({ page }) => {
    await page.goto("/concerts");

    const concertDetailLink = page.getByRole("link", {
      name: `${NORMAL_CONCERT.title} 상세 보기`,
    });

    await expect(page.getByRole("heading", { name: "공연 목록" })).toBeVisible();
    await expect(concertDetailLink).toBeVisible();
    await expect(concertDetailLink).toHaveAttribute("href", `/concerts/${NORMAL_CONCERT.id}`);
    await expect(page.getByRole("link", { name: "콘서트 등록" })).toHaveAttribute("href", "/concerts/new");
  });

  test("빈 목록이면 안내와 관리자 등록 버튼을 표시한다", async ({ page }) => {
    await page.route(/\/api\/concerts$/, (route) =>
      route.fulfill({
        json: {
          success: true,
          data: [],
        },
      }),
    );

    await page.goto("/concerts");

    await expect(page.getByText("등록된 공연이 없습니다.")).toBeVisible();
    await expect(page.getByTestId("concert-list-grid")).toHaveCount(0);
    await expect(page.getByRole("link", { name: "콘서트 등록" })).toHaveAttribute("href", "/concerts/new");
  });
});
