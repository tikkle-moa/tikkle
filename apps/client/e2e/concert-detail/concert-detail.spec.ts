import { expect, test } from "@playwright/test";

const ADMIN_USER = {
  id: 1,
  email: "admin@example.com",
  nickname: "관리자",
  profileImageUrl: null,
  role: "ADMIN",
  oauthAccounts: ["google"],
};

const CONCERT_WITHOUT_PERFORMANCE = {
  id: 900001,
  title: "E2E 회차 없는 콘서트",
};

test.describe("콘서트 상세", () => {
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

  test("회차가 없는 콘서트의 안내와 관리자 수정 버튼을 표시한다", async ({ page }) => {
    await page.goto(`/concerts/${CONCERT_WITHOUT_PERFORMANCE.id}`);

    await expect(page.getByRole("heading", { name: CONCERT_WITHOUT_PERFORMANCE.title })).toBeVisible();
    await expect(page.getByText("회차 준비 중", { exact: true })).toBeVisible();
    await expect(page.getByText("예매 회차를 준비 중입니다", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "좌석 선택하기" })).toBeDisabled();

    await expect(page.getByRole("link", { name: `${CONCERT_WITHOUT_PERFORMANCE.title} 수정` })).toHaveAttribute(
      "href",
      `/concerts/${CONCERT_WITHOUT_PERFORMANCE.id}/edit`,
    );
  });

  test("존재하지 않는 콘서트면 오류 안내를 표시한다", async ({ page }) => {
    await page.goto("/concerts/999999");

    await expect(page.getByRole("heading", { name: "공연 정보를 불러오지 못했습니다." })).toBeVisible();
    await expect(page.getByText("잠시 후 다시 시도해 주세요.")).toBeVisible();
  });
});
