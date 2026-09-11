import { render, screen } from "@testing-library/react";

import PaymentOrderSummary from "@features/payment/ui/PaymentOrderSummary";

describe("PaymentOrderSummary", () => {
  it("공연, 선택 좌석, 합계 금액을 표시한다", () => {
    render(
      <PaymentOrderSummary
        order={{
          reservationId: 1,
          orderId: "tikkle-order",
          orderName: "콘서트 2석",
          amount: 132_000,
          paymentExpiresAt: "2027-01-20T19:05:00",
          concertTitle: "아이유 콘서트",
          performanceName: "1회차",
          performanceStartsAt: "2027-01-20T19:00:00",
          venueName: "티클홀",
          seats: [
            { venueSeatId: 1, sectionName: "R석", seatLabel: "A-1", price: 66_000 },
            { venueSeatId: 2, sectionName: "R석", seatLabel: "A-2", price: 66_000 },
          ],
        }}
      />,
    );

    expect(screen.getByRole("heading", { name: "아이유 콘서트" })).toBeInTheDocument();
    expect(screen.getByText("R석 A-1")).toBeInTheDocument();
    expect(screen.getByText("R석 A-2")).toBeInTheDocument();
    expect(screen.getByText("총 2석")).toBeInTheDocument();
    expect(screen.getByText("132,000원")).toBeInTheDocument();
  });
});
