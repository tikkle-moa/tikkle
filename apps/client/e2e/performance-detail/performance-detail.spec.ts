import { expect, test } from "@playwright/test";

import { VENUE_SEAT_HEIGHT, VENUE_SEAT_WIDTH } from "../../src/entities/venue";
import { E2E_SEED_PERFORMANCES, E2E_SEED_VENUES } from "../config/e2e-seed-data.config";

test.describe("공연 회차 상세", () => {
  test("정상 회차에 접근하면 공연 정보와 좌석 배치를 표시한다", async ({ page }) => {
    const responsePromise = page.waitForResponse(
      (response) => response.url().endsWith(`/api/performances/${E2E_SEED_PERFORMANCES.upcoming.id}`) && response.request().method() === "GET",
    );

    await page.goto(`/performances/${E2E_SEED_PERFORMANCES.upcoming.id}`);
    const response = await responsePromise;

    expect(response.status()).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      success: true,
      data: {
        id: E2E_SEED_PERFORMANCES.upcoming.id,
        concertId: E2E_SEED_PERFORMANCES.upcoming.concertId,
        venueId: E2E_SEED_PERFORMANCES.upcoming.venueId,
        name: E2E_SEED_PERFORMANCES.upcoming.name,
        status: "UPCOMING",
      },
    });
    await expect(page.getByRole("heading", { name: E2E_SEED_PERFORMANCES.upcoming.name })).toBeVisible();
    await expect(page.getByText("오픈 예정", { exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "콘서트 상세로 돌아가기" })).toHaveAttribute(
      "href",
      `/concerts/${E2E_SEED_PERFORMANCES.upcoming.concertId}`,
    );
    await expect(page.getByRole("heading", { name: "좌석 배치 정보" })).toBeVisible();
    await expect(page.getByText(`${E2E_SEED_VENUES.normal.name} · 전체 4석`)).toBeVisible();
  });

  test("공연장 API 좌석 데이터와 좌석 배치 화면 표시가 일치한다", async ({ page }) => {
    const performanceResponsePromise = page.waitForResponse(
      (response) => response.url().endsWith(`/api/performances/${E2E_SEED_PERFORMANCES.upcoming.id}`) && response.request().method() === "GET",
    );
    const venueResponsePromise = page.waitForResponse(
      (response) => /\/api\/venues\/\d+$/.test(new URL(response.url()).pathname) && response.request().method() === "GET",
    );

    await page.goto(`/performances/${E2E_SEED_PERFORMANCES.upcoming.id}`);

    const [performanceResponse, venueResponse] = await Promise.all([performanceResponsePromise, venueResponsePromise]);
    const performanceBody = await performanceResponse.json();
    const venueBody = await venueResponse.json();
    const { venueSeats } = venueBody.data;
    expect(performanceResponse.status()).toBe(200);
    expect(performanceBody.data.venueId).toBe(E2E_SEED_PERFORMANCES.upcoming.venueId);
    expect(venueResponse.status()).toBe(200);
    expect(new URL(venueResponse.url()).pathname).toBe(`/api/venues/${E2E_SEED_PERFORMANCES.upcoming.venueId}`);
    expect(venueSeats).toHaveLength(4);

    for (const seat of venueSeats) {
      const seatButton = page.getByRole("button", {
        name: `${seat.seatLabel}, ${seat.price.toLocaleString()}원`,
      });
      const visibleSeat = seatButton.locator("rect");

      await expect(visibleSeat).toHaveAttribute("x", String(seat.positionX - VENUE_SEAT_WIDTH / 2));
      await expect(visibleSeat).toHaveAttribute("y", String(seat.positionY - VENUE_SEAT_HEIGHT / 2));

      await seatButton.press("Enter");
      await expect(page.getByText(`${seat.seatLabel} · ${seat.sectionName} · ${seat.price.toLocaleString()}원`)).toBeVisible();
    }
  });

  test("종료된 회차에 접근하면 상세 대신 종료 안내를 표시한다", async ({ page }) => {
    const responsePromise = page.waitForResponse(
      (response) => response.url().endsWith(`/api/performances/${E2E_SEED_PERFORMANCES.ended.id}`) && response.request().method() === "GET",
    );

    await page.goto(`/performances/${E2E_SEED_PERFORMANCES.ended.id}`);
    const response = await responsePromise;

    expect(response.status()).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      success: true,
      data: {
        id: E2E_SEED_PERFORMANCES.ended.id,
        name: E2E_SEED_PERFORMANCES.ended.name,
        status: "ENDED",
      },
    });
    await expect(page.getByRole("heading", { name: "종료된 공연 회차입니다." })).toBeVisible();
    await expect(page.getByText("다른 회차를 선택해 주세요.")).toBeVisible();
    await expect(page.getByRole("heading", { name: E2E_SEED_PERFORMANCES.ended.name })).toHaveCount(0);
  });

  test("존재하지 않는 회차에 접근하면 404 응답과 오류 안내를 표시한다", async ({ page }) => {
    const missingId = 2_147_483_647;
    const responsePromise = page.waitForResponse(
      (response) => response.url().endsWith(`/api/performances/${missingId}`) && response.request().method() === "GET",
    );

    await page.goto(`/performances/${missingId}`);
    const response = await responsePromise;

    expect(response.status()).toBe(404);
    await expect(page.getByRole("heading", { name: "공연 회차를 불러오지 못했습니다." })).toBeVisible();
    await expect(page.getByText("잠시 후 다시 시도해 주세요.")).toBeVisible();
  });

  for (const performanceId of ["not-a-number", "0", "-1"]) {
    test(`유효하지 않은 공연 회차 ID(${performanceId})면 API 요청 없이 안내를 표시한다`, async ({ page }) => {
      let detailRequestCount = 0;

      page.on("request", (request) => {
        if (/\/api\/performances\/[^/]+$/.test(new URL(request.url()).pathname)) {
          detailRequestCount += 1;
        }
      });

      await page.goto(`/performances/${performanceId}`);

      await expect(page.getByRole("heading", { name: "잘못된 공연 회차입니다." })).toBeVisible();
      await expect(page.getByText("올바르지 않은 공연 회차 ID입니다.")).toBeVisible();
      expect(detailRequestCount).toBe(0);
    });
  }
});
