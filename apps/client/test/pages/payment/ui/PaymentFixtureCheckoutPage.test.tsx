import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import PaymentFixtureCheckoutPage from "@pages/payment/ui/PaymentFixtureCheckoutPage";

const navigate = vi.hoisted(() => vi.fn());

vi.mock("react-router", async () => {
  const actual = await vi.importActual<typeof import("react-router")>("react-router");

  return {
    ...actual,
    useNavigate: () => navigate,
  };
});

describe("PaymentFixtureCheckoutPage", () => {
  beforeEach(() => {
    navigate.mockReset();
  });

  it("결제 준비 후 결제 주문서로 이동한다", async () => {
    const user = userEvent.setup();

    render(<PaymentFixtureCheckoutPage />);

    expect(screen.getByText("공연 정보를 확인하고 결제를 준비하면 다음 단계에서 결제수단을 선택할 수 있습니다.")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "결제하러 가기" }));

    expect(screen.queryByText("PAYMENT_PENDING")).not.toBeInTheDocument();
    expect(navigate).toHaveBeenCalledWith(
      "/payments/fixture",
      expect.objectContaining({
        state: expect.objectContaining({
          reservationId: 501,
          holdId: "fixture-hold-501",
          status: "PAYMENT_PENDING",
        }),
      }),
    );
  });
});
