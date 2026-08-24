import { type Page, type Route, expect, test } from "@playwright/test";

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

const CONCERT = {
  id: 42,
  title: "수정 전 콘서트",
  genre: "ROCK_METAL",
  placeName: "기존 공연장",
  posterUrl: null,
  description: "수정 전 설명",
  createdAt: "2026-08-24T12:00:00Z",
};

const mockConcert = async (page: Page, handlePatch?: (route: Route) => void | Promise<void>) => {
  await page.route("**/api/concerts/42", async (route) => {
    if (route.request().method() === "PATCH" && handlePatch) {
      await handlePatch(route);
      return;
    }

    await route.fulfill({
      json: {
        success: true,
        data: { concert: CONCERT, performances: [] },
      },
    });
  });
};

test.describe("콘서트 수정 페이지 정상 처리", () => {
  test("관리자가 기존 정보를 수정하면 변경값을 저장하고 상세 페이지로 이동한다", async ({ page }) => {
    await mockSession(page, "ADMIN");

    let requestBody: unknown;
    await mockConcert(page, async (route) => {
      requestBody = route.request().postDataJSON();
      await route.fulfill({
        json: {
          success: true,
          data: { ...CONCERT, title: "수정된 콘서트" },
        },
      });
    });

    await page.goto("/concerts/42/edit");

    await expect(page.getByRole("heading", { name: "콘서트 수정", exact: true })).toBeVisible();
    await expect(page.getByLabel("콘서트 제목")).toHaveValue("수정 전 콘서트");
    await expect(page.getByLabel("장르")).toHaveValue("ROCK_METAL");
    await expect(page.getByLabel("공연 장소")).toHaveValue("기존 공연장");

    await page.getByLabel("콘서트 제목").fill("수정된 콘서트");
    await page.getByRole("button", { name: "변경사항 저장", exact: true }).click();

    await expect(page).toHaveURL("/concerts/42");
    expect(requestBody).toEqual({ title: "수정된 콘서트" });
  });

  test("취소하면 변경을 저장하지 않고 콘서트 목록 페이지로 이동한다", async ({ page }) => {
    await mockSession(page, "ADMIN");
    let patchCount = 0;
    await mockConcert(page, async (route) => {
      patchCount += 1;
      await route.fulfill({ status: 200 });
    });
    await page.goto("/concerts/42/edit");
    await page.getByLabel("콘서트 제목").fill("저장하지 않을 제목");

    await page.getByRole("button", { name: "취소" }).click();

    await expect(page).toHaveURL("/concerts");
    expect(patchCount).toBe(0);
  });
});

test.describe("콘서트 수정 페이지 권한", () => {
  test("비로그인 사용자는 로그인 페이지로 이동한다", async ({ page }) => {
    await page.route("**/api/auth/me", (route) => route.fulfill({ status: 401 }));

    await page.goto("/concerts/1/edit");

    await expect(page).toHaveURL("/login");
  });

  test("일반 사용자는 홈으로 이동한다", async ({ page }) => {
    await mockSession(page, "USER");

    await page.goto("/concerts/1/edit");

    await expect(page).toHaveURL("/");
  });
});

test.describe("콘서트 수정 페이지의 존재하지 않는 콘서트 처리", () => {
  test.beforeEach(async ({ page }) => {
    await mockSession(page, "ADMIN");
  });

  test("잘못된 콘서트 ID는 API 요청 없이 오류 화면을 표시한다", async ({ page }) => {
    let requestCount = 0;
    await page.route("**/api/concerts/**", (route) => {
      requestCount += 1;
      return route.fulfill({ status: 404 });
    });

    await page.goto("/concerts/not-a-number/edit");

    await expect(page.getByRole("alert")).toContainText("잘못된 콘서트 ID입니다.");
    await expect(page.getByRole("button", { name: "콘서트 목록으로 돌아가기" })).toBeVisible();
    expect(requestCount).toBe(0);
  });

  test("존재하지 않는 콘서트는 오류 화면을 표시하고 목록으로 돌아갈 수 있다", async ({ page }) => {
    await page.route("**/api/concerts/999999", (route) =>
      route.fulfill({
        status: 404,
        json: { success: false, data: null, message: "Concert not found" },
      }),
    );

    await page.goto("/concerts/999999/edit");

    const alert = page.getByRole("alert");
    await expect(alert).toContainText("콘서트 정보를 표시할 수 없어요");
    await expect(alert).toContainText("콘서트 정보를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.");

    await page.getByRole("button", { name: "콘서트 목록으로 돌아가기" }).click();
    await expect(page).toHaveURL("/concerts");
  });
});

test.describe("콘서트 수정 페이지 입력 오류", () => {
  test.beforeEach(async ({ page }) => {
    await mockSession(page, "ADMIN");
  });

  test("필수 입력값이 비어 있으면 오류를 표시하고 수정 API를 호출하지 않는다", async ({ page }) => {
    let patchCount = 0;
    await mockConcert(page, async (route) => {
      patchCount += 1;
      await route.fulfill({ status: 200 });
    });
    await page.goto("/concerts/42/edit");

    await page.getByLabel("콘서트 제목").fill("");
    await page.getByLabel("공연 장소").fill("");
    await page.getByRole("button", { name: "변경사항 저장", exact: true }).click();

    await expect(page.getByText("콘서트 제목을 입력해 주세요.")).toBeVisible();
    await expect(page.getByText("공연 장소를 입력해 주세요.")).toBeVisible();
    await expect(page.getByLabel("콘서트 제목")).toHaveAttribute("aria-invalid", "true");
    await expect(page.getByLabel("공연 장소")).toHaveAttribute("aria-invalid", "true");
    expect(patchCount).toBe(0);
  });

  test("잘못된 포스터 URL은 오류를 표시하고 수정 API를 호출하지 않는다", async ({ page }) => {
    let patchCount = 0;
    await mockConcert(page, async (route) => {
      patchCount += 1;
      await route.fulfill({ status: 200 });
    });
    await page.goto("/concerts/42/edit");

    await page.getByLabel("포스터 URL").fill("invalid-url");
    await page.getByRole("button", { name: "변경사항 저장", exact: true }).click();

    await expect(page.getByText("http 또는 https 형식의 올바른 URL을 입력해 주세요.")).toBeVisible();
    await expect(page.getByLabel("포스터 URL")).toHaveAttribute("aria-invalid", "true");
    expect(patchCount).toBe(0);
  });

  test("변경된 값이 없으면 안내를 표시하고 수정 API를 호출하지 않는다", async ({ page }) => {
    let patchCount = 0;
    await mockConcert(page, async (route) => {
      patchCount += 1;
      await route.fulfill({ status: 200 });
    });
    await page.goto("/concerts/42/edit");

    await page.getByRole("button", { name: "변경사항 저장", exact: true }).click();

    await expect(page.getByRole("alert")).toHaveText(/변경된 내용이 없습니다\./);
    expect(patchCount).toBe(0);
  });
});

test.describe("콘서트 수정 페이지 API 오류", () => {
  test.beforeEach(async ({ page }) => {
    await mockSession(page, "ADMIN");
  });

  test("콘서트 조회 API가 실패하면 오류 화면을 표시하고 목록으로 돌아갈 수 있다", async ({ page }) => {
    await page.route("**/api/concerts/42", (route) =>
      route.fulfill({
        status: 500,
        json: { success: false, error: { code: 500, message: "Internal Server Error" } },
      }),
    );

    await page.goto("/concerts/42/edit");

    await expect(page.getByRole("alert")).toContainText("콘서트 정보를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.");
    await page.getByRole("button", { name: "콘서트 목록으로 돌아가기" }).click();
    await expect(page).toHaveURL("/concerts");
  });

  test("수정 API가 실패하면 오류를 표시하고 입력값을 유지한다", async ({ page }) => {
    await mockConcert(page, (route) =>
      route.fulfill({
        status: 500,
        json: { success: false, error: { code: 500, message: "Internal Server Error" } },
      }),
    );
    await page.goto("/concerts/42/edit");
    await page.getByLabel("콘서트 제목").fill("수정에 실패할 콘서트");

    await page.getByRole("button", { name: "변경사항 저장", exact: true }).click();

    await expect(page.getByRole("alert")).toHaveText(/콘서트 수정에 실패했습니다\./);
    await expect(page).toHaveURL("/concerts/42/edit");
    await expect(page.getByLabel("콘서트 제목")).toHaveValue("수정에 실패할 콘서트");
  });
});
