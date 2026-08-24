import { type Page, expect, test } from "@playwright/test";

const createUser = (role: "USER" | "ADMIN") => ({
  id: role === "ADMIN" ? 1 : 2,
  email: `${role.toLowerCase()}@example.com`,
  nickname: role === "ADMIN" ? "E2E 관리자" : "E2E 사용자",
  profileImageUrl: null,
  role,
  oauthAccounts: ["google"],
});

const mockSession = async (page: Page, role: "USER" | "ADMIN") => {
  await page.route("**/api/auth/me", (route) =>
    route.fulfill({
      json: {
        success: true,
        data: createUser(role),
      },
    }),
  );
};

const fillValidForm = async (page: Page) => {
  await page.getByLabel("콘서트 제목").fill("E2E 콘서트");
  await page.getByLabel("장르").selectOption("BALLAD");
  await page.getByLabel("공연 장소").fill("E2E 공연장");
  await page.getByLabel("콘서트 설명").fill("정상 등록 시나리오");
};

test.describe("콘서트 등록 페이지 정상 처리", () => {
  test("관리자가 유효한 정보를 입력하면 콘서트를 등록하고 상세 페이지로 이동한다", async ({ page }) => {
    await mockSession(page, "ADMIN");

    let requestBody: unknown;
    await page.route("**/api/concerts", async (route) => {
      requestBody = route.request().postDataJSON();
      await route.fulfill({
        status: 201,
        json: {
          success: true,
          data: {
            id: 77,
            title: "E2E 콘서트",
            genre: "BALLAD",
            placeName: "E2E 공연장",
            posterUrl: null,
            description: "정상 등록 시나리오",
            createdAt: "2026-08-24T12:00:00Z",
          },
        },
      });
    });

    await page.goto("/concerts/new");
    await fillValidForm(page);
    await page.getByRole("button", { name: "콘서트 등록", exact: true }).click();

    await expect(page).toHaveURL("/concerts/77");
    expect(requestBody).toEqual({
      title: "E2E 콘서트",
      genre: "BALLAD",
      placeName: "E2E 공연장",
      posterUrl: null,
      description: "정상 등록 시나리오",
    });
  });

  test("취소하면 콘서트 목록 페이지로 이동한다", async ({ page }) => {
    await mockSession(page, "ADMIN");
    await page.goto("/concerts/new");

    await page.getByRole("button", { name: "취소" }).click();

    await expect(page).toHaveURL("/concerts");
  });
});

test.describe("콘서트 등록 페이지 권한", () => {
  test("비로그인 사용자는 로그인 페이지로 이동한다", async ({ page }) => {
    await page.route("**/api/auth/me", (route) => route.fulfill({ status: 401 }));

    await page.goto("/concerts/new");

    await expect(page).toHaveURL("/login");
  });

  test("일반 사용자는 홈으로 이동한다", async ({ page }) => {
    await mockSession(page, "USER");

    await page.goto("/concerts/new");

    await expect(page).toHaveURL("/");
  });

  test("관리자는 콘서트 등록 폼을 볼 수 있다", async ({ page }) => {
    await mockSession(page, "ADMIN");

    await page.goto("/concerts/new");

    await expect(page).toHaveURL("/concerts/new");
    await expect(page.getByRole("heading", { name: "콘서트 등록", exact: true })).toBeVisible();
  });
});

test.describe("콘서트 등록 페이지 입력 오류", () => {
  test.beforeEach(async ({ page }) => {
    await mockSession(page, "ADMIN");
    await page.goto("/concerts/new");
  });

  test("필수 입력값이 비어 있으면 오류를 표시하고 등록 API를 호출하지 않는다", async ({ page }) => {
    let requestCount = 0;
    await page.route("**/api/concerts", (route) => {
      requestCount += 1;
      return route.fulfill({ status: 201, json: { success: true, data: { id: 1 } } });
    });

    await page.getByRole("button", { name: "콘서트 등록", exact: true }).click();

    await expect(page.getByText("콘서트 제목을 입력해 주세요.")).toBeVisible();
    await expect(page.getByText("장르를 선택해 주세요.")).toBeVisible();
    await expect(page.getByText("공연 장소를 입력해 주세요.")).toBeVisible();
    await expect(page.getByLabel("콘서트 제목")).toHaveAttribute("aria-invalid", "true");
    await expect(page.getByLabel("장르")).toHaveAttribute("aria-invalid", "true");
    await expect(page.getByLabel("공연 장소")).toHaveAttribute("aria-invalid", "true");
    expect(requestCount).toBe(0);
  });

  test("잘못된 포스터 URL은 오류를 표시하고 등록 API를 호출하지 않는다", async ({ page }) => {
    let requestCount = 0;
    await page.route("**/api/concerts", (route) => {
      requestCount += 1;
      return route.fulfill({ status: 201, json: { success: true, data: { id: 1 } } });
    });

    await page.getByLabel("콘서트 제목").fill("E2E 콘서트");
    await page.getByLabel("장르").selectOption("BALLAD");
    await page.getByLabel("공연 장소").fill("E2E 공연장");
    await page.getByLabel("포스터 URL").fill("invalid-url");
    await page.getByRole("button", { name: "콘서트 등록", exact: true }).click();

    await expect(page.getByText("http 또는 https 형식의 올바른 URL을 입력해 주세요.")).toBeVisible();
    await expect(page.getByLabel("포스터 URL")).toHaveAttribute("aria-invalid", "true");
    expect(requestCount).toBe(0);
  });
});

test.describe("콘서트 등록 페이지 API 오류", () => {
  test("등록 API가 실패하면 오류를 표시하고 등록 페이지에 머무른다", async ({ page }) => {
    await mockSession(page, "ADMIN");
    await page.route("**/api/concerts", (route) =>
      route.fulfill({
        status: 500,
        json: { success: false, error: { code: 500, message: "Internal Server Error" } },
      }),
    );
    await page.goto("/concerts/new");
    await fillValidForm(page);

    await page.getByRole("button", { name: "콘서트 등록", exact: true }).click();

    await expect(page.getByRole("alert")).toHaveText(/콘서트 등록에 실패했습니다\./);
    await expect(page).toHaveURL("/concerts/new");
    await expect(page.getByLabel("콘서트 제목")).toHaveValue("E2E 콘서트");
  });
});
