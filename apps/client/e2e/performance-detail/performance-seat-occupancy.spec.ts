import { type Browser, type Page, expect, test } from "@playwright/test";
import { randomUUID } from "node:crypto";

import { authenticatePage, createApiAuthHeaders } from "../api/auth.api";
import { deleteConcert } from "../api/concert.api";
import { type E2ECreateVenueSeat, createVenue, deleteVenue } from "../api/venue.api";
import { E2E_AUTH_SESSIONS } from "../config/e2e-auth-sessions.config";
import { deleteReservationsForPerformance } from "../fixtures/reservation.fixture";
import { redisCommand } from "../helpers/redis.helper";

interface PerformanceResponse {
  id: number;
  concertId: number;
  name: string;
}

interface OccupancyScenario {
  concertId: number;
  performanceId: number;
  venueId: number;
  venueSeats: Array<{
    id: number;
    seatLabel: string;
    price: number;
  }>;
}

const SCENARIO_SEATS: E2ECreateVenueSeat[] = [
  {
    sectionName: "A구역",
    seatNumber: 1,
    seatLabel: "A구역 1열 1번",
    price: 100_000,
    positionX: 20,
    positionY: 30,
  },
  {
    sectionName: "A구역",
    seatNumber: 2,
    seatLabel: "A구역 1열 2번",
    price: 100_000,
    positionX: 34,
    positionY: 30,
  },
  {
    sectionName: "B구역",
    seatNumber: 1,
    seatLabel: "B구역 1열 1번",
    price: 80_000,
    positionX: 48,
    positionY: 30,
  },
];

const createPerformance = async (page: Page, concertId: number) => {
  const request = {
    concertId,
    name: `E2E 점유 회차 ${randomUUID()}`,
    startsAt: "2099-01-20T19:00:00",
    bookingOpensAt: null,
  };
  const response = await page.request.post("/api/performances", {
    headers: createApiAuthHeaders("ADMIN"),
    data: request,
  });
  const body = await response.json();

  expect(response.status(), JSON.stringify(body)).toBe(201);
  expect(body).toMatchObject({ success: true, data: request });

  return body.data as PerformanceResponse;
};

const deletePerformance = async (page: Page, performanceId: number) => {
  const response = await page.request.delete(`/api/performances/${performanceId}`, {
    headers: createApiAuthHeaders("ADMIN"),
  });

  if (response.status() === 404) return;

  expect(response.ok(), await response.text()).toBe(true);
};

const createOccupancyScenario = async (page: Page): Promise<OccupancyScenario> => {
  const venue = await createVenue(page, "E2E 좌석 점유 공연장", SCENARIO_SEATS);
  let concertId: number | undefined;
  let performanceId: number | undefined;

  try {
    const concertRequest = {
      title: `E2E 좌석 점유 콘서트 ${randomUUID()}`,
      genre: "INDIE" as const,
      venueId: venue.venue.id,
      posterUrl: null,
      description: "좌석 점유 동시성 검증용 데이터입니다.",
    };
    const concertResponse = await page.request.post("/api/concerts", {
      headers: createApiAuthHeaders("ADMIN"),
      data: concertRequest,
    });
    const concertBody = await concertResponse.json();

    expect(concertResponse.status(), JSON.stringify(concertBody)).toBe(201);
    expect(concertBody).toMatchObject({ success: true, data: concertRequest });
    const createdConcertId = concertBody.data.id as number;
    concertId = createdConcertId;

    const performance = await createPerformance(page, createdConcertId);
    performanceId = performance.id;

    return {
      concertId,
      performanceId,
      venueId: venue.venue.id,
      venueSeats: venue.venueSeats.map(({ id, seatLabel, price }) => ({ id, seatLabel, price })),
    };
  } catch (error) {
    if (performanceId) await deletePerformance(page, performanceId);
    if (concertId) await deleteConcert(page, concertId);
    await deleteVenue(page, venue.venue.id);
    throw error;
  }
};

const cleanupOccupancyScenario = async (page: Page, scenario: OccupancyScenario) => {
  await deleteReservationsForPerformance(scenario.performanceId);
  await deletePerformance(page, scenario.performanceId);
  await deleteConcert(page, scenario.concertId);
  await deleteVenue(page, scenario.venueId);
};

const getSeat = (page: Page, seatId: number) => page.locator(`[data-seat-id="${seatId}"]`);
const SEAT_STATUS_TIMEOUT = 15_000;
const STOMP_CONNECTION_TIMEOUT = 30_000;

const waitForAvailableSeats = async (page: Page, seatIds: readonly number[]) => {
  await Promise.all(
    seatIds.map((seatId) => expect(getSeat(page, seatId)).toHaveAttribute("data-seat-status", "available", { timeout: SEAT_STATUS_TIMEOUT })),
  );
};

const expirePerformanceHolds = async (performanceId: number) => {
  const holdIds = (await redisCommand("ZRANGE", `hold:performance:${performanceId}`, "0", "-1")).split("\n").filter(Boolean);

  expect(holdIds.length).toBeGreaterThan(0);
  await Promise.all(
    holdIds.map(async (holdId) => {
      await redisCommand("ZADD", `hold:performance:${performanceId}`, "0", holdId);
      expect(await redisCommand("PEXPIRE", `hold:expiry:${holdId}`, "100")).toBe("1");
    }),
  );
};

const openOccupancyPage = async (page: Page, performanceId: number, tokenId: string, userId: number) => {
  await authenticatePage(page, "USER", tokenId, userId);
  await page.addInitScript(() => {
    if (typeof crypto.randomUUID === "function") return;

    Object.defineProperty(crypto, "randomUUID", {
      value: () => {
        const bytes = crypto.getRandomValues(new Uint8Array(16));
        bytes[6] = (bytes[6] & 0x0f) | 0x40;
        bytes[8] = (bytes[8] & 0x3f) | 0x80;
        const hex = [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
        return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
      },
    });
  });
  await page.goto(`/performances/${performanceId}`);

  await expect(page.locator('[role="status"]')).toContainText("실시간 연결됨", { timeout: STOMP_CONNECTION_TIMEOUT });
};

const openOccupancyPages = async (firstPage: Page, secondPage: Page, performanceId: number) => {
  const [firstSession, secondSession] = E2E_AUTH_SESSIONS.occupancy;
  await Promise.all([
    openOccupancyPage(firstPage, performanceId, firstSession.tokenId, firstSession.userId),
    openOccupancyPage(secondPage, performanceId, secondSession.tokenId, secondSession.userId),
  ]);
};

const createUserPages = async (browser: Browser) => {
  const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:5173";
  const firstContext = await browser.newContext({ baseURL });
  const secondContext = await browser.newContext({ baseURL });

  return {
    firstContext,
    secondContext,
    firstPage: await firstContext.newPage(),
    secondPage: await secondContext.newPage(),
  };
};

test.describe("공연 좌석 점유", () => {
  test.setTimeout(60_000);

  test("좌석 상태를 조회하고 선택한 좌석을 내 그룹으로 자동 점유한다", async ({ browser, page }) => {
    const scenario = await createOccupancyScenario(page);
    const { firstContext, secondContext, firstPage, secondPage } = await createUserPages(browser);

    try {
      const seat = scenario.venueSeats[0];
      await openOccupancyPages(firstPage, secondPage, scenario.performanceId);

      const firstSeat = getSeat(firstPage, seat.id);
      const secondSeat = getSeat(secondPage, seat.id);
      await expect(firstSeat).toHaveAttribute("data-seat-status", "available");
      await expect(secondSeat).toHaveAttribute("data-seat-status", "available");

      await firstSeat.click();

      await expect(firstSeat).toHaveAttribute("data-seat-status", "held_by_me");
      await expect(firstPage.getByRole("region", { name: "내 점유 좌석" })).toContainText(seat.seatLabel);
      await expect(firstPage.getByRole("region", { name: "내 점유 좌석" })).toContainText("1석");
      await expect(firstPage.getByText("점유 시간은", { exact: false })).toBeVisible();
      await expect(secondSeat).toHaveAttribute("data-seat-status", "held_by_other");
      await expect(secondSeat).toHaveAttribute("aria-disabled", "true");
    } finally {
      await Promise.all([firstContext.close(), secondContext.close()]);
      await cleanupOccupancyScenario(page, scenario);
    }
  });

  test("여러 좌석을 하나의 점유 그룹으로 묶고 함께 해제한다", async ({ browser, page }) => {
    const scenario = await createOccupancyScenario(page);
    const { firstContext, firstPage } = await createUserPages(browser);

    try {
      const seats = scenario.venueSeats.slice(0, 2);
      const [firstSession] = E2E_AUTH_SESSIONS.occupancy;
      await openOccupancyPage(firstPage, scenario.performanceId, firstSession.tokenId, firstSession.userId);
      await waitForAvailableSeats(
        firstPage,
        seats.map((seat) => seat.id),
      );

      for (const seat of seats) {
        await getSeat(firstPage, seat.id).click();
        await expect(getSeat(firstPage, seat.id)).toHaveAttribute("data-seat-status", "held_by_me", { timeout: SEAT_STATUS_TIMEOUT });
      }
      const myHolds = firstPage.getByRole("region", { name: "내 점유 좌석" });
      await expect(myHolds).toContainText("2석");
      for (const seat of seats) {
        await expect(myHolds).toContainText(seat.seatLabel);
      }
      await expect(firstPage.getByRole("button", { name: "점유 해제 · 2석" })).toBeVisible();

      await firstPage.getByRole("button", { name: "점유 해제 · 2석" }).click();

      for (const seat of seats) {
        await expect(getSeat(firstPage, seat.id)).toHaveAttribute("data-seat-status", "available", { timeout: SEAT_STATUS_TIMEOUT });
      }
      await expect(firstPage.getByRole("region", { name: "내 점유 좌석" })).toHaveCount(0);
    } finally {
      await firstContext.close();
      await cleanupOccupancyScenario(page, scenario);
    }
  });

  test("같은 좌석을 동시에 점유하면 한 그룹만 성공하고 다른 그룹에 실시간 반영한다", async ({ browser, page }) => {
    const scenario = await createOccupancyScenario(page);
    const { firstContext, secondContext, firstPage, secondPage } = await createUserPages(browser);

    try {
      const seat = scenario.venueSeats[0];
      await openOccupancyPages(firstPage, secondPage, scenario.performanceId);
      await Promise.all([waitForAvailableSeats(firstPage, [seat.id]), waitForAvailableSeats(secondPage, [seat.id])]);

      await Promise.all([getSeat(firstPage, seat.id).click(), getSeat(secondPage, seat.id).click()]);

      await expect
        .poll(async () => {
          const statuses = await Promise.all([
            getSeat(firstPage, seat.id).getAttribute("data-seat-status"),
            getSeat(secondPage, seat.id).getAttribute("data-seat-status"),
          ]);
          return statuses.sort();
        })
        .toEqual(["held_by_me", "held_by_other"]);

      const firstWon = (await getSeat(firstPage, seat.id).getAttribute("data-seat-status")) === "held_by_me";
      const winnerPage = firstWon ? firstPage : secondPage;
      const loserPage = firstWon ? secondPage : firstPage;

      await expect(winnerPage.getByRole("region", { name: "내 점유 좌석" })).toContainText(seat.seatLabel);
      await expect(getSeat(loserPage, seat.id)).toHaveAttribute("aria-disabled", "true");
      await expect(loserPage.getByRole("region", { name: "내 점유 좌석" })).toHaveCount(0);
    } finally {
      await Promise.all([firstContext.close(), secondContext.close()]);
      await cleanupOccupancyScenario(page, scenario);
    }
  });

  test("점유 해제 이벤트를 다른 사용자에게 전달하고 해제된 좌석을 다시 점유할 수 있다", async ({ browser, page }) => {
    const scenario = await createOccupancyScenario(page);
    const { firstContext, secondContext, firstPage, secondPage } = await createUserPages(browser);

    try {
      const seat = scenario.venueSeats[0];
      await openOccupancyPages(firstPage, secondPage, scenario.performanceId);
      await Promise.all([waitForAvailableSeats(firstPage, [seat.id]), waitForAvailableSeats(secondPage, [seat.id])]);

      await getSeat(firstPage, seat.id).click();
      await expect(getSeat(firstPage, seat.id)).toHaveAttribute("data-seat-status", "held_by_me");
      await expect(getSeat(secondPage, seat.id)).toHaveAttribute("data-seat-status", "held_by_other");

      await expect(firstPage.getByRole("button", { name: "점유 해제 · 1석" })).toBeVisible();
      await firstPage.getByRole("button", { name: "점유 해제 · 1석" }).click();

      await expect(getSeat(firstPage, seat.id)).toHaveAttribute("data-seat-status", "available", { timeout: SEAT_STATUS_TIMEOUT });
      await expect(getSeat(secondPage, seat.id)).toHaveAttribute("data-seat-status", "available", { timeout: SEAT_STATUS_TIMEOUT });
      await expect(firstPage.getByRole("region", { name: "내 점유 좌석" })).toHaveCount(0);

      await getSeat(secondPage, seat.id).click();
      await expect(getSeat(secondPage, seat.id)).toHaveAttribute("data-seat-status", "held_by_me", { timeout: SEAT_STATUS_TIMEOUT });
      await expect(secondPage.getByRole("region", { name: "내 점유 좌석" })).toContainText(seat.seatLabel);
    } finally {
      await Promise.all([firstContext.close(), secondContext.close()]);
      await cleanupOccupancyScenario(page, scenario);
    }
  });

  test("점유 시간이 만료되면 다른 사용자에게 해제 상태를 실시간 반영하고 다시 점유할 수 있다", async ({ browser, page }) => {
    const scenario = await createOccupancyScenario(page);
    const { firstContext, secondContext, firstPage, secondPage } = await createUserPages(browser);

    try {
      const seat = scenario.venueSeats[0];
      await openOccupancyPages(firstPage, secondPage, scenario.performanceId);
      await Promise.all([waitForAvailableSeats(firstPage, [seat.id]), waitForAvailableSeats(secondPage, [seat.id])]);

      await getSeat(firstPage, seat.id).click();
      await expect(getSeat(firstPage, seat.id)).toHaveAttribute("data-seat-status", "held_by_me");
      await expect(getSeat(secondPage, seat.id)).toHaveAttribute("data-seat-status", "held_by_other");
      await firstPage.getByRole("button", { name: "전체 선택 취소" }).click();

      await expirePerformanceHolds(scenario.performanceId);

      await expect(getSeat(firstPage, seat.id)).toHaveAttribute("data-seat-status", "available", { timeout: SEAT_STATUS_TIMEOUT });
      await expect(getSeat(secondPage, seat.id)).toHaveAttribute("data-seat-status", "available", { timeout: SEAT_STATUS_TIMEOUT });

      await getSeat(secondPage, seat.id).click();
      await expect(getSeat(secondPage, seat.id)).toHaveAttribute("data-seat-status", "held_by_me", { timeout: SEAT_STATUS_TIMEOUT });
    } finally {
      await Promise.all([firstContext.close(), secondContext.close()]);
      await cleanupOccupancyScenario(page, scenario);
    }
  });

  test("결제 대기 시간이 만료되면 다른 사용자에게 해제 상태를 실시간 반영하고 다시 점유할 수 있다", async ({ browser, page }) => {
    const scenario = await createOccupancyScenario(page);
    const { firstContext, secondContext, firstPage, secondPage } = await createUserPages(browser);
    try {
      const seat = scenario.venueSeats[0];
      await openOccupancyPages(firstPage, secondPage, scenario.performanceId);
      await Promise.all([waitForAvailableSeats(firstPage, [seat.id]), waitForAvailableSeats(secondPage, [seat.id])]);

      await getSeat(firstPage, seat.id).click();
      await expect(getSeat(firstPage, seat.id)).toHaveAttribute("data-seat-status", "held_by_me");
      await expect(getSeat(secondPage, seat.id)).toHaveAttribute("data-seat-status", "held_by_other");

      await firstPage.getByRole("button", { name: "예매 정보 확인하기" }).click();
      await expect(firstPage).toHaveURL(new RegExp(`/performances/${scenario.performanceId}/checkout$`));
      await firstPage.getByRole("button", { name: "예매 정보 확정하기" }).click();
      await expect(firstPage).toHaveURL(/\/payments\/\d+\/checkout$/);

      await expirePerformanceHolds(scenario.performanceId);

      await expect(getSeat(secondPage, seat.id)).toHaveAttribute("data-seat-status", "available", { timeout: SEAT_STATUS_TIMEOUT });
      await getSeat(secondPage, seat.id).click();
      await expect(getSeat(secondPage, seat.id)).toHaveAttribute("data-seat-status", "held_by_me", { timeout: SEAT_STATUS_TIMEOUT });
    } finally {
      await Promise.all([firstContext.close(), secondContext.close()]);
      await cleanupOccupancyScenario(page, scenario);
    }
  });
});
