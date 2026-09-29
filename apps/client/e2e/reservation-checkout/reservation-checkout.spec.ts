import { type Browser, type Page, expect, test } from "@playwright/test";
import { randomUUID } from "node:crypto";

import { authenticatePage, createApiAuthHeaders } from "../api/auth.api";
import { createVenue } from "../api/venue.api";

interface CapturedStompMessage {
  success?: boolean;
  data?: {
    reservationId?: number;
    orderId?: string;
    amount?: number;
  };
}

interface CheckoutResult {
  reservationId: number;
  orderId: string;
  amount: number;
}

const USER_TOKEN_ID = "00000000-0000-4000-8000-000000000002";
const SEAT_LABEL = "A구역 1열 1번";

const createCheckoutScenario = async (page: Page) => {
  const venue = await createVenue(page, "E2E 예매 테스트 공연장", [
    {
      sectionName: "A구역",
      seatNumber: 1,
      seatLabel: SEAT_LABEL,
      price: 150_000,
      positionX: 20,
      positionY: 30,
    },
  ]);
  const concertRequest = {
    title: `E2E 예매 테스트 공연 ${randomUUID()}`,
    genre: "INDIE",
    venueId: venue.venue.id,
    posterUrl: null,
    description: "예매 및 결제 E2E 검증용 데이터입니다.",
  };
  const concertResponse = await page.request.post("/api/concerts", {
    headers: createApiAuthHeaders("ADMIN"),
    data: concertRequest,
  });
  const concertBody = await concertResponse.json();

  expect(concertResponse.status(), JSON.stringify(concertBody)).toBe(201);
  expect(concertBody).toMatchObject({ success: true, data: concertRequest });

  const performanceRequest = {
    concertId: concertBody.data.id as number,
    name: `E2E 예매 테스트 회차 ${randomUUID()}`,
    startsAt: "2099-01-20T19:00:00",
    bookingOpensAt: null,
  };
  const performanceResponse = await page.request.post("/api/performances", {
    headers: createApiAuthHeaders("ADMIN"),
    data: performanceRequest,
  });
  const performanceBody = await performanceResponse.json();

  expect(performanceResponse.status(), JSON.stringify(performanceBody)).toBe(201);
  expect(performanceBody).toMatchObject({ success: true, data: performanceRequest });

  return {
    performanceId: performanceBody.data.id as number,
    performanceName: performanceRequest.name,
  };
};

const findSeat = (page: Page) => page.getByRole("button", { name: new RegExp(SEAT_LABEL) }).first();

const captureStompMessages = (page: Page) => {
  const messages: CapturedStompMessage[] = [];

  page.on("websocket", (socket) => {
    socket.on("framereceived", ({ payload }) => {
      const frame = typeof payload === "string" ? payload : payload.toString();
      const separatorIndex = frame.indexOf("\n\n");
      if (separatorIndex === -1) return;

      const body = frame.slice(separatorIndex + 2).split("\0", 1)[0];
      if (!body) return;

      try {
        messages.push(JSON.parse(body) as CapturedStompMessage);
      } catch {
        return;
      }
    });
  });

  return messages;
};

const createBookingPage = async (browser: Browser) => {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.addInitScript(() => {
    if (typeof crypto.randomUUID === "function") return;

    Object.defineProperty(crypto, "randomUUID", {
      value: () => {
        const bytes = crypto.getRandomValues(new Uint8Array(16));
        bytes[6] = (bytes[6] & 0x0f) | 0x40;
        bytes[8] = (bytes[8] & 0x3f) | 0x80;
        const value = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
        return `${value.slice(0, 8)}-${value.slice(8, 12)}-${value.slice(12, 16)}-${value.slice(16, 20)}-${value.slice(20)}`;
      },
    });
  });
  await authenticatePage(page, "USER", USER_TOKEN_ID);
  const stompMessages = captureStompMessages(page);

  return { context, page, stompMessages };
};

const bookSeatToPaymentOrder = async (
  page: Page,
  stompMessages: CapturedStompMessage[],
  performanceId: number,
  performanceName: string,
): Promise<CheckoutResult> => {
  await page.goto(`/performances/${performanceId}`);
  await expect(page.getByRole("heading", { name: performanceName })).toBeVisible();
  await expect(page.getByText("실시간 연결됨", { exact: true })).toBeVisible();
  await expect(findSeat(page)).toHaveAttribute("data-seat-status", "available");

  await findSeat(page).click();
  await expect(findSeat(page)).toHaveAttribute("data-seat-status", "held_by_my_group");
  await page.getByRole("button", { name: "예매 정보 확인하기" }).click();
  await expect(page).toHaveURL(new RegExp(`/performances/${performanceId}/checkout$`));
  await expect(page.getByRole("heading", { name: "예매자와 공연 정보를 확인해 주세요" })).toBeVisible();
  await expect(page.getByText(new RegExp(SEAT_LABEL))).toBeVisible();

  await page.getByRole("button", { name: "예매 정보 확정하기" }).click();
  await expect(page).toHaveURL(/\/payments\/\d+\/checkout$/);
  await expect(page.getByRole("heading", { name: "결제 주문을 확인해 주세요" })).toBeVisible();
  await expect(page.getByText(new RegExp(SEAT_LABEL))).toBeVisible();

  await expect.poll(() => stompMessages.some((message) => message.success && message.data?.reservationId && message.data.orderId)).toBe(true);
  const startCheckoutMessage = stompMessages.find((message) => message.success && message.data?.reservationId && message.data.orderId);
  const { reservationId, orderId, amount } = startCheckoutMessage?.data ?? {};
  if (typeof reservationId !== "number" || typeof orderId !== "string" || typeof amount !== "number") {
    throw new Error("예매 시작 응답에서 결제 주문 정보를 찾지 못했습니다.");
  }

  const routeReservationId = Number(new URL(page.url()).pathname.split("/")[2]);
  expect(reservationId).toBe(routeReservationId);
  await expect(page.getByText("150,000원", { exact: true }).first()).toBeVisible();

  return { reservationId, orderId, amount };
};

const cancelPayment = async (page: Page, reservationId: number) => {
  await page.goto(`/payments/fail?reservationId=${reservationId}`);
  await expect(page.getByRole("heading", { name: "결제가 취소되었습니다" })).toBeVisible();
};

test.describe("실제 브라우저 예매 및 결제 흐름", () => {
  test("좌석을 선택해 결제 주문을 확인하고 결제 취소 결과를 표시한다", async ({ browser, page }) => {
    const performance = await createCheckoutScenario(page);
    const { context, page: bookingPage, stompMessages } = await createBookingPage(browser);

    try {
      const checkout = await bookSeatToPaymentOrder(bookingPage, stompMessages, performance.performanceId, performance.performanceName);

      await cancelPayment(bookingPage, checkout.reservationId);
    } finally {
      await context.close();
    }
  });

  test("주문 금액과 다른 결제 승인 콜백은 거부하고 오류를 표시한다", async ({ browser, page }) => {
    const performance = await createCheckoutScenario(page);
    const { context, page: bookingPage, stompMessages } = await createBookingPage(browser);

    try {
      const checkout = await bookSeatToPaymentOrder(bookingPage, stompMessages, performance.performanceId, performance.performanceName);
      const successUrl = new URL("/payments/success", bookingPage.url());
      successUrl.searchParams.set("paymentKey", "e2e-invalid-amount-payment");
      successUrl.searchParams.set("orderId", checkout.orderId);
      successUrl.searchParams.set("amount", String(checkout.amount + 1));

      await bookingPage.goto(successUrl.toString());
      await expect(bookingPage.getByRole("heading", { name: "결제 승인에 실패했습니다." })).toBeVisible();
      await expect(bookingPage.getByText("결제 금액이 일치하지 않습니다.")).toBeVisible();

      await cancelPayment(bookingPage, checkout.reservationId);
    } finally {
      await context.close();
    }
  });
});
