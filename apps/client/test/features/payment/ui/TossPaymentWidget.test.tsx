import { render, screen, waitFor } from "@testing-library/react";
import { loadTossPayments } from "@tosspayments/tosspayments-sdk";

import TossPaymentWidget from "@features/payment/ui/TossPaymentWidget";

vi.mock("@tosspayments/tosspayments-sdk", () => ({
  loadTossPayments: vi.fn(),
}));

const order = {
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
};

const user = {
  id: 1,
  email: "user@example.com",
  nickname: "티클 사용자",
  profileImageUrl: null,
  role: "USER" as const,
  oauthAccounts: [],
};

describe("TossPaymentWidget", () => {
  beforeEach(() => {
    vi.stubEnv("VITE_TOSS_CLIENT_KEY", "test_gck_docs_fixture");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.clearAllMocks();
  });

  it("결제수단과 테스트 결제 버튼을 렌더링한다", async () => {
    const widgets = {
      setAmount: vi.fn().mockResolvedValue(undefined),
      renderPaymentMethods: vi.fn().mockResolvedValue({ destroy: vi.fn() }),
      renderAgreement: vi.fn().mockResolvedValue({ destroy: vi.fn() }),
      requestPayment: vi.fn(),
    };
    vi.mocked(loadTossPayments).mockResolvedValue({
      widgets: vi.fn().mockReturnValue(widgets),
    } as never);

    render(<TossPaymentWidget order={order} user={user} />);

    await waitFor(() => expect(screen.getByRole("button", { name: "300,000원 결제하기" })).toBeEnabled());
    expect(loadTossPayments).toHaveBeenCalledWith("test_gck_docs_fixture");
    expect(widgets.setAmount).toHaveBeenCalledWith({ currency: "KRW", value: 300_000 });
  });
});
