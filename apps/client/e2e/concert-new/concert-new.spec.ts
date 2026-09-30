import { type Page, expect, test } from "@playwright/test";
import { randomUUID } from "node:crypto";

import { authenticatePage, mockOAuthSession, setApiRole } from "../api/auth.api";
import { deleteConcert } from "../api/concert.api";
import { getDefaultVenue } from "../api/venue.api";

const fillValidForm = async (page: Page, title: string) => {
  const venue = await getDefaultVenue(page);
  await page.getByLabel("콘서트 제목").fill(title);
  await page.getByLabel("장르").selectOption("BALLAD");
  await page.getByLabel("공연장").selectOption(String(venue.id));
  await page.getByLabel("콘서트 설명").fill("정상 등록 시나리오");

  return venue;
};

test.describe("콘서트 등록 페이지 정상 처리", () => {
  test.beforeEach(async ({ page }) => {
    await authenticatePage(page, "ADMIN");
  });

  test("유효한 정보를 API로 등록하고 조회할 수 있다", async ({ page }) => {
    const title = `E2E 신규 콘서트 ${randomUUID()}`;
    let concertId: number | undefined;

    try {
      await page.goto("/concerts/new");
      const venue = await fillValidForm(page, title);

      const responsePromise = page.waitForResponse((response) => response.url().endsWith("/api/concerts") && response.request().method() === "POST");
      await page.getByRole("button", { name: "콘서트 등록", exact: true }).click();
      const response = await responsePromise;
      const body = await response.json();

      expect(response.status()).toBe(201);
      expect(response.request().postDataJSON()).toEqual({
        title,
        genre: "BALLAD",
        venueId: venue.id,
        posterUrl: null,
        description: "정상 등록 시나리오",
      });
      expect(body).toMatchObject({
        success: true,
        data: {
          title,
          genre: "BALLAD",
          venueId: venue.id,
          venueName: venue.name,
          posterUrl: null,
          description: "정상 등록 시나리오",
        },
      });

      concertId = body.data.id;
      expect(concertId).toBeGreaterThan(0);

      await expect(page).toHaveURL(`/concerts/${concertId}/performances/new`);

      const getResponse = await page.request.get(`/api/concerts/${concertId}`);
      expect(getResponse.status()).toBe(200);
      await expect(getResponse.json()).resolves.toMatchObject({
        success: true,
        data: { concert: { id: concertId, title, description: "정상 등록 시나리오" } },
      });
    } finally {
      if (concertId) await deleteConcert(page, concertId);
    }
  });

  test("취소하면 콘서트 목록 페이지로 이동한다", async ({ page }) => {
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
    await authenticatePage(page, "USER");
    await page.goto("/concerts/new");
    await expect(page).toHaveURL("/");
  });

  test("관리자는 콘서트 등록 폼을 볼 수 있다", async ({ page }) => {
    await authenticatePage(page, "ADMIN");
    await page.goto("/concerts/new");
    await expect(page.getByRole("heading", { name: "콘서트 등록", exact: true })).toBeVisible();
  });
});

test.describe("콘서트 등록 페이지 입력 오류", () => {
  test.beforeEach(async ({ page }) => {
    await authenticatePage(page, "ADMIN");
    await page.goto("/concerts/new");
  });

  test("필수 입력값이 비어 있으면 오류를 표시하고 POST 요청을 보내지 않는다", async ({ page }) => {
    let postCount = 0;
    page.on("request", (request) => {
      if (request.url().endsWith("/api/concerts") && request.method() === "POST") postCount += 1;
    });

    await page.getByRole("button", { name: "콘서트 등록", exact: true }).click();

    await expect(page.getByText("콘서트 제목을 입력해 주세요.")).toBeVisible();
    await expect(page.getByText("장르를 선택해 주세요.")).toBeVisible();
    await expect(page.getByText("공연장을 선택해 주세요.")).toBeVisible();
    expect(postCount).toBe(0);
  });

  test("잘못된 포스터 URL은 오류를 표시하고 POST 요청을 보내지 않는다", async ({ page }) => {
    let postCount = 0;
    page.on("request", (request) => {
      if (request.url().endsWith("/api/concerts") && request.method() === "POST") postCount += 1;
    });
    await fillValidForm(page, "E2E 콘서트");
    await page.getByLabel("포스터 URL").fill("invalid-url");

    await page.getByRole("button", { name: "콘서트 등록", exact: true }).click();

    await expect(page.getByText("http 또는 https 형식의 올바른 URL을 입력해 주세요.")).toBeVisible();
    expect(postCount).toBe(0);
  });
});

test.describe("콘서트 등록 페이지 API 오류", () => {
  test("화면은 관리자지만 서버 권한이 일반 사용자이면 403 오류를 처리한다", async ({ page }) => {
    await mockOAuthSession(page, "ADMIN");
    await setApiRole(page, "USER");
    await page.goto("/concerts/new");
    await fillValidForm(page, `권한 거부 콘서트 ${randomUUID()}`);

    const responsePromise = page.waitForResponse((response) => response.url().endsWith("/api/concerts") && response.request().method() === "POST");
    await page.getByRole("button", { name: "콘서트 등록", exact: true }).click();
    const response = await responsePromise;

    expect(response.status()).toBe(403);
    await expect(page.getByRole("alert")).toHaveText(/콘서트 등록에 실패했습니다\./);
    await expect(page).toHaveURL("/concerts/new");
  });
});
