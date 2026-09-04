import { type Page, expect, test } from "@playwright/test";

import { authenticatePage, setApiRole } from "../api/auth.api";
import { createVenue, deleteVenue } from "../api/venue.api";
import { E2E_SEED_VENUES } from "../config/e2e-seed-data.config";

const getLayoutPoint = async (page: Page, x: number, y: number) => {
  const editor = page.getByRole("img", { name: "공연장 좌석 배치 편집기" });
  return editor.evaluate(
    (element, point) => {
      const svg = element as SVGSVGElement;
      const screenMatrix = svg.getScreenCTM();
      if (!screenMatrix) throw new Error("좌석 배치도의 화면 좌표를 계산할 수 없습니다.");

      const svgPoint = svg.createSVGPoint();
      svgPoint.x = point.x;
      svgPoint.y = point.y;
      const screenPoint = svgPoint.matrixTransform(screenMatrix);
      return { x: screenPoint.x, y: screenPoint.y };
    },
    { x, y },
  );
};

const selectSeatFromList = async (page: Page, seatLabel: string) => {
  const seatButton = page.getByRole("button", { name: seatLabel, exact: true });
  const clientId = await seatButton.getAttribute("data-seat-client-id");
  if (!clientId) throw new Error(`좌석 ${seatLabel}의 client ID를 찾을 수 없습니다.`);

  await seatButton.click();
  return clientId;
};

test.describe("공연장 수정 페이지 정상 처리", () => {
  test.beforeEach(async ({ page }) => {
    await authenticatePage(page, "ADMIN");
  });

  test("공연장을 불러와 변경된 필드만 수정하고 결과를 조회할 수 있다", async ({ page }) => {
    const detail = await createVenue(page);

    try {
      await page.goto(`/venues/${detail.venue.id}/edit`);
      await expect(page.getByLabel("공연장 이름")).toHaveValue(detail.venue.name);
      await expect(page.getByLabel("주소")).toHaveValue(detail.venue.address);
      await expect(page.getByText(/1석 · 드래그 이동/)).toBeVisible();

      const changedName = `${detail.venue.name} 수정`;
      await page.getByLabel("공연장 이름").fill(changedName);
      const responsePromise = page.waitForResponse(
        (response) => response.url().endsWith(`/api/venues/${detail.venue.id}`) && response.request().method() === "PATCH",
      );
      await page.getByRole("button", { name: "공연장 수정", exact: true }).click();
      const response = await responsePromise;

      expect(response.status()).toBe(200);
      expect(response.request().postDataJSON()).toEqual({ venue: { name: changedName } });
      await expect(response.json()).resolves.toMatchObject({ success: true, data: { venue: { id: detail.venue.id, name: changedName } } });
      await expect(page).toHaveURL(`/venues/${detail.venue.id}`);

      const getResponse = await page.request.get(`/api/venues/${detail.venue.id}`);
      expect(getResponse.status()).toBe(200);
      await expect(getResponse.json()).resolves.toMatchObject({ success: true, data: { venue: { id: detail.venue.id, name: changedName } } });
    } finally {
      await deleteVenue(page, detail.venue.id);
    }
  });

  test("새 좌석 배치를 추가하고 기존 좌석을 삭제한 결과를 조회할 수 있다", async ({ page }) => {
    const detail = await createVenue(page, "E2E 좌석 교체 대상");

    try {
      await page.goto(`/venues/${detail.venue.id}/edit`);
      await page.getByRole("button", { name: "15개 좌석 생성" }).click();
      await expect(page.getByText(/16석 · 드래그 이동/)).toBeVisible();
      await page.getByRole("button", { name: "기존구역 1번", exact: true }).click();
      await page.getByRole("button", { name: "선택 좌석 삭제" }).click();
      await expect(page.getByText(/15석 · 드래그 이동/)).toBeVisible();

      const responsePromise = page.waitForResponse(
        (response) => response.url().endsWith(`/api/venues/${detail.venue.id}`) && response.request().method() === "PATCH",
      );
      await page.getByRole("button", { name: "공연장 수정", exact: true }).click();
      const response = await responsePromise;
      const request = response.request().postDataJSON();

      expect(response.status()).toBe(200);
      expect(request).not.toHaveProperty("venue");
      expect(request.deletedVenueSeatIds).toEqual([detail.venueSeats[0].id]);
      expect(request.venueSeats).toHaveLength(15);
      expect(request.venueSeats).toEqual(
        expect.arrayContaining([expect.objectContaining({ sectionName: "A구역", seatNumber: 1, seatLabel: "A구역 1번" })]),
      );

      const getResponse = await page.request.get(`/api/venues/${detail.venue.id}`);
      const getBody = await getResponse.json();
      expect(getResponse.status()).toBe(200);
      expect(getBody.data.venueSeats).toHaveLength(15);
      expect(getBody.data.venueSeats).not.toEqual(expect.arrayContaining([expect.objectContaining({ id: detail.venueSeats[0].id })]));
    } finally {
      await deleteVenue(page, detail.venue.id);
    }
  });

  test("기존 좌석 정보만 수정하고 변경된 좌석만 전송한다", async ({ page }) => {
    const detail = await createVenue(page, "E2E 좌석 수정 대상");
    const seat = detail.venueSeats[0];

    try {
      await page.goto(`/venues/${detail.venue.id}/edit`);
      await page.getByRole("button", { name: seat.seatLabel, exact: true }).click();
      await page.locator("#selected-seat-label").fill("기존구역 VIP 1번");
      await page.locator("#selected-seat-price").fill("60000");

      const responsePromise = page.waitForResponse(
        (response) => response.url().endsWith(`/api/venues/${detail.venue.id}`) && response.request().method() === "PATCH",
      );
      await page.getByRole("button", { name: "공연장 수정", exact: true }).click();
      const response = await responsePromise;

      expect(response.status()).toBe(200);
      expect(response.request().postDataJSON()).toEqual({
        venueSeats: [
          {
            id: seat.id,
            sectionName: seat.sectionName,
            seatNumber: seat.seatNumber,
            seatLabel: "기존구역 VIP 1번",
            price: 60_000,
            positionX: seat.positionX,
            positionY: seat.positionY,
          },
        ],
      });

      const getResponse = await page.request.get(`/api/venues/${detail.venue.id}`);
      await expect(getResponse.json()).resolves.toMatchObject({
        success: true,
        data: { venueSeats: [expect.objectContaining({ id: seat.id, seatLabel: "기존구역 VIP 1번", price: 60_000 })] },
      });
    } finally {
      await deleteVenue(page, detail.venue.id);
    }
  });

  test("취소하면 변경을 저장하지 않고 목록으로 이동한다", async ({ page }) => {
    const detail = await createVenue(page, "E2E 취소 대상");

    try {
      await page.goto(`/venues/${detail.venue.id}/edit`);
      await page.getByLabel("공연장 이름").fill(`${detail.venue.name} 미저장`);
      await page.getByRole("button", { name: "취소", exact: true }).click();

      await expect(page).toHaveURL("/venues");
      const getResponse = await page.request.get(`/api/venues/${detail.venue.id}`);
      await expect(getResponse.json()).resolves.toMatchObject({ data: { venue: { name: detail.venue.name } } });
    } finally {
      await deleteVenue(page, detail.venue.id);
    }
  });
});

test.describe("공연장 수정 페이지 권한", () => {
  test("비로그인 사용자는 로그인 페이지로 이동한다", async ({ page }) => {
    await page.route("**/api/auth/me", (route) => route.fulfill({ status: 401 }));
    await page.goto(`/venues/${E2E_SEED_VENUES.normal.id}/edit`);
    await expect(page).toHaveURL("/login");
  });

  test("일반 사용자는 홈으로 이동한다", async ({ page }) => {
    await authenticatePage(page, "USER");
    await page.goto(`/venues/${E2E_SEED_VENUES.normal.id}/edit`);
    await expect(page).toHaveURL("/");
  });
});

test.describe("공연장 수정 페이지 조회 오류", () => {
  test.beforeEach(async ({ page }) => {
    await authenticatePage(page, "ADMIN");
  });

  test("잘못된 공연장 ID는 GET 요청 없이 오류 화면을 표시한다", async ({ page }) => {
    let getCount = 0;
    page.on("request", (request) => {
      if (request.url().includes("/api/venues/") && request.method() === "GET") getCount += 1;
    });

    await page.goto("/venues/not-a-number/edit");

    await expect(page.getByRole("alert")).toContainText("잘못된 공연장 ID입니다.");
    expect(getCount).toBe(0);
  });

  test("존재하지 않는 공연장의 404 응답을 처리하고 목록으로 돌아간다", async ({ page }) => {
    const missingId = 2_147_483_647;
    const responsePromise = page.waitForResponse(
      (response) => response.url().endsWith(`/api/venues/${missingId}`) && response.request().method() === "GET",
    );
    await page.goto(`/venues/${missingId}/edit`);
    const response = await responsePromise;

    expect(response.status()).toBe(404);
    await expect(page.getByRole("alert")).toContainText("공연장 정보를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.");
    await page.getByRole("button", { name: "공연장 목록으로 돌아가기" }).click();
    await expect(page).toHaveURL("/venues");
  });
});

test.describe("공연장 수정 페이지 입력 오류", () => {
  test.beforeEach(async ({ page }) => {
    await authenticatePage(page, "ADMIN");
  });

  test("필수 입력값이 비어 있으면 오류를 표시하고 PATCH 요청을 보내지 않는다", async ({ page }) => {
    const detail = await createVenue(page, "E2E 필수값 검증");
    let patchCount = 0;
    page.on("request", (request) => {
      if (request.url().endsWith(`/api/venues/${detail.venue.id}`) && request.method() === "PATCH") patchCount += 1;
    });

    try {
      await page.goto(`/venues/${detail.venue.id}/edit`);
      await page.getByLabel("공연장 이름").fill("");
      await page.getByRole("button", { name: "공연장 수정", exact: true }).click();

      await expect(page.getByText("공연장 이름을 입력해 주세요.")).toBeVisible();
      expect(patchCount).toBe(0);
    } finally {
      await deleteVenue(page, detail.venue.id);
    }
  });

  test("변경된 값이 없으면 안내하고 PATCH 요청을 보내지 않는다", async ({ page }) => {
    const detail = await createVenue(page, "E2E 변경 없음");
    let patchCount = 0;
    page.on("request", (request) => {
      if (request.url().endsWith(`/api/venues/${detail.venue.id}`) && request.method() === "PATCH") patchCount += 1;
    });

    try {
      await page.goto(`/venues/${detail.venue.id}/edit`);
      await page.getByRole("button", { name: "공연장 수정", exact: true }).click();

      await expect(page.getByRole("alert")).toHaveText(/변경된 내용이 없습니다\./);
      expect(patchCount).toBe(0);
    } finally {
      await deleteVenue(page, detail.venue.id);
    }
  });
});

test.describe("공연장 수정 페이지 API 권한 오류", () => {
  test("화면 진입 후 서버 권한이 사라지면 403 응답과 입력값을 처리한다", async ({ page }) => {
    await authenticatePage(page, "ADMIN");
    const detail = await createVenue(page, "E2E 수정 권한 거부");

    try {
      await page.goto(`/venues/${detail.venue.id}/edit`);
      const changedName = `${detail.venue.name} 수정 실패`;
      await page.getByLabel("공연장 이름").fill(changedName);
      await setApiRole(page, "USER");

      const responsePromise = page.waitForResponse(
        (response) => response.url().endsWith(`/api/venues/${detail.venue.id}`) && response.request().method() === "PATCH",
      );
      await page.getByRole("button", { name: "공연장 수정", exact: true }).click();
      const response = await responsePromise;

      expect(response.status()).toBe(403);
      await expect(page.getByRole("alert")).toHaveText(/공연장 수정에 실패했습니다\./);
      await expect(page.getByLabel("공연장 이름")).toHaveValue(changedName);
      await expect(page).toHaveURL(`/venues/${detail.venue.id}/edit`);
    } finally {
      await deleteVenue(page, detail.venue.id);
    }
  });
});

test.describe("공연장 수정 페이지 대규모 좌석 배치", () => {
  test("1,500석 좌석 배치를 청크와 가상 목록으로 렌더링한다", async ({ page }) => {
    await authenticatePage(page, "ADMIN");
    const venue = E2E_SEED_VENUES.large;
    const detailResponsePromise = page.waitForResponse(
      (response) => response.url().endsWith(`/api/venues/${venue.id}`) && response.request().method() === "GET",
    );

    await page.goto(`/venues/${venue.id}/edit`);
    const detailResponse = await detailResponsePromise;

    expect(detailResponse.status()).toBe(200);
    const detailBody = await detailResponse.json();
    expect(detailBody).toMatchObject({ success: true, data: { venue: { id: venue.id, name: venue.name } } });
    expect(detailBody.data.venueSeats).toHaveLength(venue.seatCount);
    await expect(page.getByText(/1,500석 · 드래그 이동/)).toBeVisible();

    const editor = page.getByRole("img", { name: "공연장 좌석 배치 편집기" });
    const seatPaths = editor.locator('g[pointer-events="none"] path');
    const renderedSeatCount = await seatPaths.evaluateAll((paths) =>
      paths.reduce((count, path) => count + ((path.getAttribute("d") ?? "").match(/M/g)?.length ?? 0), 0),
    );

    expect(renderedSeatCount).toBe(venue.seatCount);
    expect(await seatPaths.count()).toBeLessThan(venue.seatCount);

    const visibleSeatButtons = page.locator("button[data-seat-client-id]");
    await expect(visibleSeatButtons.first()).toBeVisible();
    expect(await visibleSeatButtons.count()).toBeLessThan(venue.seatCount);

    const seatList = page.locator("div.overflow-y-auto").filter({ has: visibleSeatButtons });
    await seatList.evaluate((element) => element.scrollTo(0, element.scrollHeight));

    const lastSeat = page.getByRole("button", { name: "J구역 10열 15번", exact: true });
    await expect(lastSeat).toBeVisible();
    await lastSeat.click();
    await expect(lastSeat).toHaveAttribute("aria-pressed", "true");
  });
});

test.describe("공연장 수정 페이지 좌석 배치 상호작용", () => {
  test.beforeEach(async ({ page }) => {
    await authenticatePage(page, "ADMIN");
  });

  test("확대, 축소 및 화면 초기화 버튼으로 배치도를 제어한다", async ({ page }) => {
    const detail = await createVenue(page, "E2E 배치도 확대");

    try {
      await page.goto(`/venues/${detail.venue.id}/edit`);
      await expect(page.getByText("100%", { exact: true })).toBeVisible();

      await page.getByRole("button", { name: "확대" }).click();
      await expect(page.getByText("125%", { exact: true })).toBeVisible();
      await page.getByRole("button", { name: "축소" }).click();
      await expect(page.getByText("100%", { exact: true })).toBeVisible();

      await page.getByRole("button", { name: "확대" }).click();
      await page.getByRole("button", { name: "화면 초기화" }).click();
      await expect(page.getByText("100%", { exact: true })).toBeVisible();
    } finally {
      await deleteVenue(page, detail.venue.id);
    }
  });

  test("같은 구역 좌석을 더블 클릭하면 구역 전체를 선택한다", async ({ page }) => {
    const detail = await createVenue(page, "E2E 구역 선택");

    try {
      await page.goto(`/venues/${detail.venue.id}/edit`);
      await page.getByRole("button", { name: "15개 좌석 생성" }).click();
      const clientId = await selectSeatFromList(page, "A구역 1번");

      await page.locator(`g[data-seat-client-id="${clientId}"]`).dblclick();
      await expect(page.getByText("좌석 15개 선택됨", { exact: true })).toBeVisible();
    } finally {
      await deleteVenue(page, detail.venue.id);
    }
  });

  test("Alt 드래그로 영역 안의 좌석을 함께 선택한다", async ({ page }) => {
    const detail = await createVenue(page, "E2E 영역 선택");

    try {
      await page.goto(`/venues/${detail.venue.id}/edit`);
      await page.getByRole("button", { name: "15개 좌석 생성" }).click();
      await page.getByRole("img", { name: "공연장 좌석 배치 편집기" }).scrollIntoViewIfNeeded();
      const start = await getLayoutPoint(page, 5, 20);
      const end = await getLayoutPoint(page, 95, 60);

      await page.keyboard.down("Alt");
      await page.mouse.move(start.x, start.y);
      await page.mouse.down();
      await page.mouse.move(end.x, end.y, { steps: 5 });
      await page.mouse.up();
      await page.keyboard.up("Alt");

      await expect(page.getByText("좌석 16개 선택됨", { exact: true })).toBeVisible();
    } finally {
      await deleteVenue(page, detail.venue.id);
    }
  });

  test("선택 좌석을 드래그하면 좌표가 변경된다", async ({ page }) => {
    const detail = await createVenue(page, "E2E 좌석 이동");
    const seat = detail.venueSeats[0];

    try {
      await page.goto(`/venues/${detail.venue.id}/edit`);
      const clientId = await selectSeatFromList(page, seat.seatLabel);
      const selectedSeat = page.locator(`g[data-seat-client-id="${clientId}"]`);
      await selectedSeat.scrollIntoViewIfNeeded();
      const seatBounds = await selectedSeat.boundingBox();
      if (!seatBounds) throw new Error("이동할 좌석의 화면 위치를 찾을 수 없습니다.");
      const start = { x: seatBounds.x + seatBounds.width / 2, y: seatBounds.y + seatBounds.height / 2 };
      const end = { x: start.x + 20, y: start.y + 10 };

      await page.mouse.move(start.x, start.y);
      await page.mouse.down();
      await page.mouse.move(end.x, end.y, { steps: 5 });
      await page.mouse.up();

      await expect(page.getByRole("spinbutton", { name: "X 좌표 *", exact: true })).not.toHaveValue(String(seat.positionX));
      await expect(page.getByRole("spinbutton", { name: "Y 좌표 *", exact: true })).not.toHaveValue(String(seat.positionY));
    } finally {
      await deleteVenue(page, detail.venue.id);
    }
  });

  test("좌석을 다른 좌석 위로 드래그하면 충돌 오류를 표시한다", async ({ page }) => {
    const detail = await createVenue(page, "E2E 좌석 충돌");
    const seat = detail.venueSeats[0];

    try {
      await page.goto(`/venues/${detail.venue.id}/edit`);
      await page.getByRole("button", { name: "15개 좌석 생성" }).click();
      const clientId = await selectSeatFromList(page, seat.seatLabel);
      const selectedSeat = page.locator(`g[data-seat-client-id="${clientId}"]`);
      await selectedSeat.scrollIntoViewIfNeeded();
      const seatBounds = await selectedSeat.boundingBox();
      if (!seatBounds) throw new Error("이동할 좌석의 화면 위치를 찾을 수 없습니다.");
      const target = await getLayoutPoint(page, 30, 35);
      const start = { x: seatBounds.x + seatBounds.width / 2, y: seatBounds.y + seatBounds.height / 2 };

      await page.mouse.move(start.x, start.y);
      await page.mouse.down();
      await page.mouse.move(target.x, target.y, { steps: 5 });
      await page.mouse.up();

      await expect(page.getByText(/같은 좌표에 중복된 영역이 있습니다\./).first()).toBeVisible();
    } finally {
      await deleteVenue(page, detail.venue.id);
    }
  });
});
