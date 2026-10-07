import { type Browser, type Page, expect } from "@playwright/test";
import { randomUUID } from "node:crypto";

import { authenticatePage } from "../api/auth.api";
import { E2E_AUTH_SESSIONS } from "../config/e2e-auth-sessions.config";
import { RESERVATION_CHECKOUT_SEAT_LABEL, test } from "../fixtures/reservation-checkout.fixture";

interface CapturedStompMessage {
  success?: boolean;
  data?: {
    reservationId?: number;
    orderId?: string;
    amount?: number;
    status?: string;
  };
}

interface CheckoutResult {
  reservationId: number;
  orderId: string;
  amount: number;
}

const findSeat = (page: Page) => page.getByRole("button", { name: new RegExp(RESERVATION_CHECKOUT_SEAT_LABEL) }).first();

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
  const context = await browser.newContext({
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:5173",
  });
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
  await authenticatePage(page, "USER", E2E_AUTH_SESSIONS.checkout.tokenId);
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
  await expect(findSeat(page)).toHaveAttribute("data-seat-status", "held_by_me");
  await page.getByRole("button", { name: "예매 정보 확인하기" }).click();
  await expect(page).toHaveURL(new RegExp(`/performances/${performanceId}/checkout$`));
  await expect(page.getByRole("heading", { name: "예매자와 공연 정보를 확인해 주세요" })).toBeVisible();
  await expect(page.getByText(new RegExp(RESERVATION_CHECKOUT_SEAT_LABEL))).toBeVisible();

  await page.getByRole("button", { name: "예매 정보 확정하기" }).click();
  await expect(page).toHaveURL(/\/payments\/\d+\/checkout$/);
  await expect(page.getByRole("heading", { name: "결제 주문을 확인해 주세요" })).toBeVisible();
  await expect(page.getByText(new RegExp(RESERVATION_CHECKOUT_SEAT_LABEL))).toBeVisible();

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

const cancelPayment = async (page: Page, stompMessages: CapturedStompMessage[], reservationId: number, performanceId: number) => {
  await page.goto(`/payments/fail?reservationId=${reservationId}`);
  await expect(page.getByRole("heading", { name: "결제가 취소되었습니다" })).toBeVisible();
  await expect
    .poll(() => stompMessages.some((message) => message.data?.reservationId === reservationId && message.data.status === "CANCELLED"))
    .toBe(true);

  await page.goto(`/performances/${performanceId}`);
  await expect(findSeat(page)).toHaveAttribute("data-seat-status", "available");
};

const confirmPayment = async (page: Page, checkout: CheckoutResult, paymentKey: string) => {
  const successUrl = new URL("/payments/success", page.url());
  successUrl.searchParams.set("paymentKey", paymentKey);
  successUrl.searchParams.set("orderId", checkout.orderId);
  successUrl.searchParams.set("amount", String(checkout.amount));

  await page.goto(successUrl.toString());
  await expect(page.getByRole("heading", { name: "예매가 완료되었습니다" })).toBeVisible();
};

test.describe("실제 브라우저 예매 및 결제 흐름", () => {
  test("좌석을 선택해 결제 주문을 확인하고 결제 취소 후 예매와 좌석 상태를 되돌린다", async ({ browser, checkoutScenario }) => {
    let context: Awaited<ReturnType<typeof createBookingPage>>["context"] | undefined;

    try {
      const booking = await createBookingPage(browser);
      context = booking.context;
      const checkout = await bookSeatToPaymentOrder(
        booking.page,
        booking.stompMessages,
        checkoutScenario.performanceId,
        checkoutScenario.performanceName,
      );
      await cancelPayment(booking.page, booking.stompMessages, checkout.reservationId, checkoutScenario.performanceId);
    } finally {
      await context?.close();
    }
  });

  test("좌석 점유·예매·결제 완료 후 내 예매에서 취소한다", async ({ browser, checkoutScenario }) => {
    let context: Awaited<ReturnType<typeof createBookingPage>>["context"] | undefined;

    try {
      const booking = await createBookingPage(browser);
      context = booking.context;
      const checkout = await bookSeatToPaymentOrder(
        booking.page,
        booking.stompMessages,
        checkoutScenario.performanceId,
        checkoutScenario.performanceName,
      );
      await confirmPayment(booking.page, checkout, `e2e-payment-${randomUUID()}`);

      const paidReservationResponse = await booking.page.request.get(`/api/reservations/${checkout.reservationId}`);
      const paidReservationBody = await paidReservationResponse.json();
      expect(paidReservationResponse.status(), JSON.stringify(paidReservationBody)).toBe(200);
      expect(paidReservationBody.data).toMatchObject({
        concertTitle: checkoutScenario.concertTitle,
        id: checkout.reservationId,
        status: "SUCCEEDED",
        seats: [{ sectionName: "A구역", seatLabel: RESERVATION_CHECKOUT_SEAT_LABEL }],
      });

      await booking.page.goto(`/my/reservations/${checkout.reservationId}`);
      await expect(booking.page.getByRole("heading", { name: checkoutScenario.concertTitle })).toBeVisible();
      await expect(booking.page.getByText("예매 완료", { exact: true })).toBeVisible();
      await booking.page.getByRole("button", { name: "좌석 보기" }).click();
      const seatMapDialog = booking.page.getByRole("dialog", { name: "예매 좌석 보기" });
      await expect(seatMapDialog).toBeVisible();

      const highlightedSeats = seatMapDialog.locator('[data-seat-id][data-selected="true"]');
      await expect(highlightedSeats).toHaveCount(1);
      const reservationSeat = highlightedSeats.first();
      await expect(reservationSeat).toHaveAttribute("data-seat-id", String(checkoutScenario.reservationSeatId));
      const seatVisual = reservationSeat.locator("[data-seat-visual]");
      const seatPosition = await seatVisual.evaluate((element) => {
        const rect = element as SVGRectElement;
        return {
          x: Number(rect.getAttribute("x")) + Number(rect.getAttribute("width")) / 2,
          y: Number(rect.getAttribute("y")) + Number(rect.getAttribute("height")) / 2,
        };
      });
      expect(seatPosition).toEqual({
        x: checkoutScenario.reservationSeatPositionX,
        y: checkoutScenario.reservationSeatPositionY,
      });
      await expect(seatMapDialog.locator(`[data-seat-id="${checkoutScenario.otherSeatId}"]`)).toHaveAttribute("data-selected", "false");
      await seatMapDialog.getByRole("button", { name: "닫기" }).click();

      await booking.page.getByRole("button", { name: "예매 취소" }).click();
      const cancelDialog = booking.page.getByRole("dialog", { name: "예매를 취소할까요?" });
      await cancelDialog.getByRole("button", { name: "예매 취소" }).click();
      await expect(booking.page.getByText("예매가 취소되었습니다.")).toBeVisible();
      await expect(booking.page.getByText("환불 완료", { exact: true })).toBeVisible();

      const cancelledReservationResponse = await booking.page.request.get(`/api/reservations/${checkout.reservationId}`);
      const cancelledReservationBody = await cancelledReservationResponse.json();
      expect(cancelledReservationResponse.status(), JSON.stringify(cancelledReservationBody)).toBe(200);
      expect(cancelledReservationBody.data).toMatchObject({
        id: checkout.reservationId,
        status: "REFUNDED",
        seats: [{ sectionName: "A구역", seatLabel: RESERVATION_CHECKOUT_SEAT_LABEL }],
      });

      await booking.page.goto(`/performances/${checkoutScenario.performanceId}`);
      await expect(findSeat(booking.page)).toHaveAttribute("data-seat-status", "available", { timeout: 15_000 });
    } finally {
      await context?.close();
    }
  });

  test("주문 금액과 다른 결제 승인 콜백은 거부하고 오류를 표시한다", async ({ browser, checkoutScenario }) => {
    let context: Awaited<ReturnType<typeof createBookingPage>>["context"] | undefined;

    try {
      const booking = await createBookingPage(browser);
      context = booking.context;
      const checkout = await bookSeatToPaymentOrder(
        booking.page,
        booking.stompMessages,
        checkoutScenario.performanceId,
        checkoutScenario.performanceName,
      );
      const successUrl = new URL("/payments/success", booking.page.url());
      successUrl.searchParams.set("paymentKey", "e2e-invalid-amount-payment");
      successUrl.searchParams.set("orderId", checkout.orderId);
      successUrl.searchParams.set("amount", String(checkout.amount + 1));

      await booking.page.goto(successUrl.toString());
      await expect(booking.page.getByRole("heading", { name: "결제 승인에 실패했습니다." })).toBeVisible();
      await expect(booking.page.getByText("결제 금액이 일치하지 않습니다.")).toBeVisible();

      await cancelPayment(booking.page, booking.stompMessages, checkout.reservationId, checkoutScenario.performanceId);
    } finally {
      await context?.close();
    }
  });
});
