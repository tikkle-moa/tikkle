import { type Page, expect, test } from "@playwright/test";
import { randomUUID } from "node:crypto";

import { authenticatePage, mockOAuthSession, setApiRole } from "../api/auth.api";
import { deleteVenue } from "../api/venue.api";

const fillValidForm = async (page: Page, name: string) => {
  await page.getByLabel("공연장 이름").fill(name);
  await page.getByLabel("주소").fill("서울특별시 E2E구 신규로 1");
  await page.getByLabel("공연장 설명").fill("정상 등록 시나리오");
  await page.getByRole("button", { name: "15개 좌석 생성" }).click();
};

test.describe("공연장 등록 페이지 정상 처리", () => {
  test.beforeEach(async ({ page }) => {
    await authenticatePage(page, "ADMIN");
  });

  test("유효한 공연장과 좌석 배치를 API로 등록하고 조회할 수 있다", async ({ page }) => {
    const name = `E2E 신규 공연장 ${randomUUID()}`;
    let venueId: number | undefined;

    try {
      await page.goto("/venues/new");
      await fillValidForm(page, name);

      const responsePromise = page.waitForResponse((response) => response.url().endsWith("/api/venues") && response.request().method() === "POST");
      await page.getByRole("button", { name: "공연장 등록", exact: true }).click();
      const response = await responsePromise;
      const request = response.request().postDataJSON();
      const body = await response.json();

      expect(response.status()).toBe(201);
      expect(request.venue).toEqual({
        name,
        address: "서울특별시 E2E구 신규로 1",
        description: "정상 등록 시나리오",
        width: 100,
        height: 100,
        stagePositionX: 50,
        stagePositionY: 5,
        stageWidth: 40,
        stageHeight: 10,
      });
      expect(request.venueSeats).toHaveLength(15);
      expect(request.venueSeats[0]).toEqual({
        sectionName: "A구역",
        seatNumber: 1,
        seatLabel: "A구역 1번",
        price: 50_000,
        positionX: 30,
        positionY: 35,
      });
      expect(body).toMatchObject({
        success: true,
        data: {
          venue: { name, address: "서울특별시 E2E구 신규로 1" },
          venueSeats: expect.arrayContaining([expect.objectContaining({ sectionName: "A구역", seatNumber: 1 })]),
        },
      });

      venueId = body.data.venue.id;
      await expect(page).toHaveURL(`/venues/${venueId}`);

      const getResponse = await page.request.get(`/api/venues/${venueId}`);
      expect(getResponse.status()).toBe(200);
      const getBody = await getResponse.json();
      expect(getBody).toMatchObject({ success: true, data: { venue: { id: venueId, name } } });
      expect(getBody.data.venueSeats).toHaveLength(15);
    } finally {
      if (venueId) await deleteVenue(page, venueId);
    }
  });

  test("취소하면 공연장 목록 페이지로 이동한다", async ({ page }) => {
    await page.goto("/venues/new");
    await page.getByRole("button", { name: "취소", exact: true }).click();
    await expect(page).toHaveURL("/venues");
  });
});

test.describe("공연장 등록 페이지 권한", () => {
  test("비로그인 사용자는 로그인 페이지로 이동한다", async ({ page }) => {
    await page.route("**/api/auth/me", (route) => route.fulfill({ status: 401 }));
    await page.goto("/venues/new");
    await expect(page).toHaveURL("/login");
  });

  test("일반 사용자는 홈으로 이동한다", async ({ page }) => {
    await authenticatePage(page, "USER");
    await page.goto("/venues/new");
    await expect(page).toHaveURL("/");
  });

  test("관리자는 공연장 등록 폼을 볼 수 있다", async ({ page }) => {
    await authenticatePage(page, "ADMIN");
    await page.goto("/venues/new");
    await expect(page.getByRole("heading", { name: "공연장 등록", exact: true })).toBeVisible();
    await expect(page.getByRole("img", { name: "공연장 좌석 배치 편집기" })).toBeVisible();
  });
});

test.describe("공연장 등록 페이지 입력 오류", () => {
  test.beforeEach(async ({ page }) => {
    await authenticatePage(page, "ADMIN");
    await page.goto("/venues/new");
  });

  test("필수 입력값이 비어 있으면 오류를 표시하고 POST 요청을 보내지 않는다", async ({ page }) => {
    let postCount = 0;
    page.on("request", (request) => {
      if (request.url().endsWith("/api/venues") && request.method() === "POST") postCount += 1;
    });

    await page.getByRole("button", { name: "공연장 등록", exact: true }).click();

    await expect(page.getByText("공연장 이름을 입력해 주세요.")).toBeVisible();
    await expect(page.getByText("주소를 입력해 주세요.")).toBeVisible();
    await expect(page.getByText("좌석을 하나 이상 추가해 주세요.")).toBeVisible();
    await expect(page.getByText("기본 정보, 좌석 정보에서 3개의 오류가 발견되었습니다.")).toBeVisible();
    expect(postCount).toBe(0);
  });

  test("무대가 공연장 범위를 벗어나면 오류를 표시하고 POST 요청을 보내지 않는다", async ({ page }) => {
    let postCount = 0;
    page.on("request", (request) => {
      if (request.url().endsWith("/api/venues") && request.method() === "POST") postCount += 1;
    });
    await fillValidForm(page, "E2E 무대 범위 검증");
    await page.getByLabel("공연장 가로").fill("60");

    await page.getByRole("button", { name: "공연장 등록", exact: true }).click();

    await expect(page.getByText("무대가 공연장 범위를 벗어납니다.")).toBeVisible();
    expect(postCount).toBe(0);
  });

  test("한 번에 500석을 초과하여 일괄 생성할 수 없다", async ({ page }) => {
    await page.getByRole("spinbutton", { name: "행 *", exact: true }).fill("1");
    await page.getByRole("spinbutton", { name: "열 *", exact: true }).fill("501");

    await page.getByRole("button", { name: "501개 좌석 생성" }).click();

    await expect(page.getByRole("alert")).toHaveText("한 번에 최대 500석까지 생성할 수 있습니다.");
    await expect(page.locator("button[data-seat-client-id]")).toHaveCount(0);
  });

  test("좌석 일괄 생성 시 같은 구역의 좌석 번호를 중복 등록할 수 없다", async ({ page }) => {
    let postCount = 0;
    page.on("request", (request) => {
      if (request.url().endsWith("/api/venues") && request.method() === "POST") postCount += 1;
    });

    await page.getByRole("button", { name: "15개 좌석 생성" }).click();
    await expect(page.getByText(/15석 · 드래그 이동/)).toBeVisible();
    await page.getByLabel("시작 좌석 번호").fill("1");
    await page.getByLabel("시작 X").fill("50");
    await page.getByRole("button", { name: "15개 좌석 생성" }).click();

    await expect(page.getByRole("alert")).toHaveText("같은 구역에 중복된 좌석 번호가 있습니다.");
    await expect(page.getByText(/15석 · 드래그 이동/)).toBeVisible();
    expect(postCount).toBe(0);
  });
});

test.describe("공연장 등록 페이지 API 오류", () => {
  test("화면은 관리자지만 서버 권한이 일반 사용자이면 403 오류와 입력값을 처리한다", async ({ page }) => {
    await mockOAuthSession(page, "ADMIN");
    await setApiRole(page, "USER");
    const name = `권한 거부 공연장 ${randomUUID()}`;
    await page.goto("/venues/new");
    await fillValidForm(page, name);

    const responsePromise = page.waitForResponse((response) => response.url().endsWith("/api/venues") && response.request().method() === "POST");
    await page.getByRole("button", { name: "공연장 등록", exact: true }).click();
    const response = await responsePromise;

    expect(response.status()).toBe(403);
    await expect(page.getByRole("alert")).toHaveText(/공연장 등록에 실패했습니다\./);
    await expect(page.getByLabel("공연장 이름")).toHaveValue(name);
    await expect(page).toHaveURL("/venues/new");
  });
});
