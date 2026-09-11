import { render, screen } from "@testing-library/react";

import TossPaymentWidget from "@features/payment/ui/TossPaymentWidget";

describe("TossPaymentWidget", () => {
  it("미리보기 모드에서는 실제 결제를 막는다", () => {
    render(
      <TossPaymentWidget
        previewOnly
        user={{
          id: 1,
          email: "user@example.com",
          nickname: "티클 사용자",
          profileImageUrl: null,
          role: "USER",
          oauthAccounts: [],
        }}
        order={{
          reservationId: 501,
          orderId: "tikkle-fixture-501",
          orderName: "2026 Summer Festival 2석",
          amount: 300_000,
          paymentExpiresAt: "2026-09-11T23:30:00",
          concertTitle: "2026 Summer Festival",
          performanceName: "2026 Summer Festival 1회차",
          performanceStartsAt: "2026-08-20T19:00:00",
          venueName: "올림픽공원 KSPO DOME",
          seats: [
            { venueSeatId: 101, sectionName: "A구역", seatLabel: "A구역 1열 1번", price: 150_000 },
            { venueSeatId: 102, sectionName: "A구역", seatLabel: "A구역 1열 2번", price: 150_000 },
          ],
        }}
      />,
    );

    expect(screen.getByText("결제수단 UI 미리보기")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "미리보기 전용" })).toBeDisabled();
  });
});
