import { type Page, test as base, expect } from "@playwright/test";
import { randomUUID } from "node:crypto";

import { deleteReservationsForPerformance } from "./reservation.fixture";

import { createApiAuthHeaders } from "../api/auth.api";
import { deleteConcert } from "../api/concert.api";
import { createVenue, deleteVenue } from "../api/venue.api";

export const RESERVATION_CHECKOUT_SEAT_LABEL = "A구역 1열 1번";

const deletePerformance = async (page: Page, performanceId: number) => {
  const response = await page.request.delete(`/api/performances/${performanceId}`, {
    headers: createApiAuthHeaders("ADMIN"),
  });

  if (response.status() === 404) return;

  expect(response.ok(), await response.text()).toBe(true);
};

const createCheckoutScenario = async (page: Page) => {
  let venueId: number | undefined;
  let concertId: number | undefined;
  let performanceId: number | undefined;

  try {
    const venue = await createVenue(page, "E2E 예매 테스트 공연장", [
      {
        sectionName: "A구역",
        seatNumber: 1,
        seatLabel: RESERVATION_CHECKOUT_SEAT_LABEL,
        price: 150_000,
        positionX: 20,
        positionY: 30,
      },
    ]);
    venueId = venue.venue.id;

    const concertRequest = {
      title: `E2E 예매 테스트 공연 ${randomUUID()}`,
      genre: "INDIE",
      venueId,
      posterUrl: null,
      description: "예매 및 결제 E2E 검증용 데이터입니다.",
    };
    const concertResponse = await page.request.post("/api/concerts", {
      headers: createApiAuthHeaders("ADMIN"),
      data: concertRequest,
    });
    const concertBody = await concertResponse.json();

    if (typeof concertBody.data?.id === "number") concertId = concertBody.data.id;
    expect(concertResponse.status(), JSON.stringify(concertBody)).toBe(201);
    expect(concertBody).toMatchObject({ success: true, data: concertRequest });
    if (!concertId) throw new Error("공연 생성 응답에서 ID를 찾지 못했습니다.");

    const performanceRequest = {
      concertId,
      name: `E2E 예매 테스트 회차 ${randomUUID()}`,
      startsAt: "2099-01-20T19:00:00",
      bookingOpensAt: null,
    };
    const performanceResponse = await page.request.post("/api/performances", {
      headers: createApiAuthHeaders("ADMIN"),
      data: performanceRequest,
    });
    const performanceBody = await performanceResponse.json();

    if (typeof performanceBody.data?.id === "number") performanceId = performanceBody.data.id;
    expect(performanceResponse.status(), JSON.stringify(performanceBody)).toBe(201);
    expect(performanceBody).toMatchObject({ success: true, data: performanceRequest });
    if (!performanceId) throw new Error("회차 생성 응답에서 ID를 찾지 못했습니다.");

    return { concertId, performanceId, performanceName: performanceRequest.name, venueId };
  } catch (error) {
    if (performanceId) await deletePerformance(page, performanceId);
    if (concertId) await deleteConcert(page, concertId);
    if (venueId) await deleteVenue(page, venueId);
    throw error;
  }
};

const cleanupCheckoutScenario = async (page: Page, scenario: Awaited<ReturnType<typeof createCheckoutScenario>>) => {
  await deleteReservationsForPerformance(scenario.performanceId);
  await deletePerformance(page, scenario.performanceId);
  await deleteConcert(page, scenario.concertId);
  await deleteVenue(page, scenario.venueId);
};

export const test = base.extend<{
  checkoutScenario: Awaited<ReturnType<typeof createCheckoutScenario>>;
}>({
  checkoutScenario: async ({ page }, use) => {
    const scenario = await createCheckoutScenario(page);

    try {
      // Playwright fixture의 use는 React Hook이 아닙니다.
      // eslint-disable-next-line react-hooks/rules-of-hooks
      await use(scenario);
    } finally {
      await cleanupCheckoutScenario(page, scenario);
    }
  },
});
