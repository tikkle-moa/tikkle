import { expect, test } from "@playwright/test";

import { authenticatePage, setApiRole } from "../api/auth.api";
import { createConcert, deleteConcert } from "../api/concert.api";

test.describe("콘서트 수정 페이지 정상 처리", () => {
  test.beforeEach(async ({ page }) => {
    await authenticatePage(page, "ADMIN");
  });

  test("콘서트를 불러와 변경된 필드만 수정하고 결과를 조회할 수 있다", async ({ page }) => {
    const concert = await createConcert(page);

    try {
      await page.goto(`/concerts/${concert.id}/edit`);
      await expect(page.getByLabel("콘서트 제목")).toHaveValue(concert.title);
      await expect(page.getByLabel("장르")).toHaveValue(concert.genre);

      const changedTitle = `${concert.title} 수정`;
      await page.getByLabel("콘서트 제목").fill(changedTitle);
      const responsePromise = page.waitForResponse(
        (response) => response.url().endsWith(`/api/concerts/${concert.id}`) && response.request().method() === "PATCH",
      );
      await page.getByRole("button", { name: "변경사항 저장", exact: true }).click();
      const response = await responsePromise;

      expect(response.status()).toBe(200);
      expect(response.request().postDataJSON()).toEqual({ title: changedTitle });
      await expect(response.json()).resolves.toMatchObject({
        success: true,
        data: { id: concert.id, title: changedTitle },
      });
      await expect(page).toHaveURL(`/concerts/${concert.id}`);

      const getResponse = await page.request.get(`/api/concerts/${concert.id}`);
      expect(getResponse.status()).toBe(200);
      await expect(getResponse.json()).resolves.toMatchObject({
        success: true,
        data: { concert: { id: concert.id, title: changedTitle } },
      });
    } finally {
      await deleteConcert(page, concert.id);
    }
  });

  test("취소하면 변경을 저장하지 않고 목록으로 이동한다", async ({ page }) => {
    const concert = await createConcert(page, "E2E 취소 대상");

    try {
      await page.goto(`/concerts/${concert.id}/edit`);
      await page.getByLabel("콘서트 제목").fill(`${concert.title} 미저장`);
      await page.getByRole("button", { name: "취소" }).click();

      await expect(page).toHaveURL("/concerts");
      const getResponse = await page.request.get(`/api/concerts/${concert.id}`);
      await expect(getResponse.json()).resolves.toMatchObject({
        data: { concert: { title: concert.title } },
      });
    } finally {
      await deleteConcert(page, concert.id);
    }
  });
});

test.describe("콘서트 수정 페이지 권한", () => {
  test("비로그인 사용자는 로그인 페이지로 이동한다", async ({ page }) => {
    await page.route("**/api/auth/me", (route) => route.fulfill({ status: 401 }));
    await page.goto("/concerts/1/edit");
    await expect(page).toHaveURL("/login");
  });

  test("일반 사용자는 홈으로 이동한다", async ({ page }) => {
    await authenticatePage(page, "USER");
    await page.goto("/concerts/1/edit");
    await expect(page).toHaveURL("/");
  });
});

test.describe("콘서트 수정 페이지 조회 오류", () => {
  test.beforeEach(async ({ page }) => {
    await authenticatePage(page, "ADMIN");
  });

  test("잘못된 콘서트 ID는 GET 요청 없이 오류 화면을 표시한다", async ({ page }) => {
    let getCount = 0;
    page.on("request", (request) => {
      if (request.url().includes("/api/concerts/") && request.method() === "GET") getCount += 1;
    });

    await page.goto("/concerts/not-a-number/edit");

    await expect(page.getByRole("alert")).toContainText("잘못된 콘서트 ID입니다.");
    expect(getCount).toBe(0);
  });

  test("존재하지 않는 콘서트의 404 응답을 처리하고 목록으로 돌아간다", async ({ page }) => {
    const missingId = 2_147_483_647;
    const responsePromise = page.waitForResponse(
      (response) => response.url().endsWith(`/api/concerts/${missingId}`) && response.request().method() === "GET",
    );
    await page.goto(`/concerts/${missingId}/edit`);
    const response = await responsePromise;

    expect(response.status()).toBe(404);
    await expect(page.getByRole("alert")).toContainText("콘서트 정보를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.");
    await page.getByRole("button", { name: "콘서트 목록으로 돌아가기" }).click();
    await expect(page).toHaveURL("/concerts");
  });
});

test.describe("콘서트 수정 페이지 입력 오류", () => {
  test.beforeEach(async ({ page }) => {
    await authenticatePage(page, "ADMIN");
  });

  test("필수 입력값이 비어 있으면 오류를 표시하고 PATCH 요청을 보내지 않는다", async ({ page }) => {
    const concert = await createConcert(page, "E2E 필수값 검증");
    let patchCount = 0;
    page.on("request", (request) => {
      if (request.url().endsWith(`/api/concerts/${concert.id}`) && request.method() === "PATCH") patchCount += 1;
    });

    try {
      await page.goto(`/concerts/${concert.id}/edit`);
      await page.getByLabel("콘서트 제목").fill("");
      await page.getByRole("button", { name: "변경사항 저장", exact: true }).click();

      await expect(page.getByText("콘서트 제목을 입력해 주세요.")).toBeVisible();
      expect(patchCount).toBe(0);
    } finally {
      await deleteConcert(page, concert.id);
    }
  });

  test("잘못된 포스터 URL은 오류를 표시하고 PATCH 요청을 보내지 않는다", async ({ page }) => {
    const concert = await createConcert(page, "E2E URL 검증");
    let patchCount = 0;
    page.on("request", (request) => {
      if (request.url().endsWith(`/api/concerts/${concert.id}`) && request.method() === "PATCH") patchCount += 1;
    });

    try {
      await page.goto(`/concerts/${concert.id}/edit`);
      await page.getByLabel("포스터 URL").fill("invalid-url");
      await page.getByRole("button", { name: "변경사항 저장", exact: true }).click();

      await expect(page.getByText("http 또는 https 형식의 올바른 URL을 입력해 주세요.")).toBeVisible();
      expect(patchCount).toBe(0);
    } finally {
      await deleteConcert(page, concert.id);
    }
  });

  test("변경된 값이 없으면 안내하고 PATCH 요청을 보내지 않는다", async ({ page }) => {
    const concert = await createConcert(page, "E2E 변경 없음");
    let patchCount = 0;
    page.on("request", (request) => {
      if (request.url().endsWith(`/api/concerts/${concert.id}`) && request.method() === "PATCH") patchCount += 1;
    });

    try {
      await page.goto(`/concerts/${concert.id}/edit`);
      await page.getByRole("button", { name: "변경사항 저장", exact: true }).click();

      await expect(page.getByRole("alert")).toHaveText(/변경된 내용이 없습니다\./);
      expect(patchCount).toBe(0);
    } finally {
      await deleteConcert(page, concert.id);
    }
  });
});

test.describe("콘서트 수정 페이지 API 권한 오류", () => {
  test("화면 진입 후 서버 권한이 사라지면 403 응답과 입력값을 처리한다", async ({ page }) => {
    await authenticatePage(page, "ADMIN");
    const concert = await createConcert(page, "E2E 수정 권한 거부");

    try {
      await page.goto(`/concerts/${concert.id}/edit`);
      const changedTitle = `${concert.title} 수정 실패`;
      await page.getByLabel("콘서트 제목").fill(changedTitle);
      await setApiRole(page, "USER");

      const responsePromise = page.waitForResponse(
        (response) => response.url().endsWith(`/api/concerts/${concert.id}`) && response.request().method() === "PATCH",
      );
      await page.getByRole("button", { name: "변경사항 저장", exact: true }).click();
      const response = await responsePromise;

      expect(response.status()).toBe(403);
      await expect(page.getByRole("alert")).toHaveText(/콘서트 수정에 실패했습니다\./);
      await expect(page.getByLabel("콘서트 제목")).toHaveValue(changedTitle);
      await expect(page).toHaveURL(`/concerts/${concert.id}/edit`);
    } finally {
      await deleteConcert(page, concert.id);
    }
  });
});
