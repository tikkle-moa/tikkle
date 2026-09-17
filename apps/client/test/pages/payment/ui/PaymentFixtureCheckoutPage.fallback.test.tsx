import { render, screen } from "@testing-library/react";

import PaymentFixtureCheckoutPage from "@pages/payment/ui/PaymentFixtureCheckoutPage";

vi.mock("react-router", () => ({
  useNavigate: () => vi.fn(),
}));

vi.mock("@features/payment", () => ({
  PAYMENT_FIXTURE_RESERVATION_ID: 501,
  createPaymentCheckoutFixture: () => ({
    reservationId: 501,
    holdId: "fixture-hold-501",
    orderId: "fixture-order-501",
    orderName: "fixture",
    amount: 300000,
    paymentExpiresAt: new Date().toISOString(),
    status: "PAYMENT_PENDING",
  }),
  createPaymentOrderFixture: () => ({
    reservationId: 501,
    orderId: "fixture-order-501",
    orderName: "fixture",
    amount: 300000,
    paymentExpiresAt: new Date().toISOString(),
    concertTitle: "테스트 공연",
    posterUrl: null,
    performanceName: "1회차",
    performanceStartsAt: "2026-08-20T19:00:00",
    venueName: "테스트 공연장",
    seats: [{ venueSeatId: 1, sectionName: "A구역", seatLabel: "1번", price: 300000 }],
  }),
}));

describe("PaymentFixtureCheckoutPage poster fallback", () => {
  it("poster URL이 없으면 이미지 src를 비워 둔다", () => {
    render(<PaymentFixtureCheckoutPage />);

    expect(screen.getByAltText("테스트 공연 포스터")).not.toHaveAttribute("src");
  });
});
