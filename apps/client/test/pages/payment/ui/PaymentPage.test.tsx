import { MemoryRouter } from "react-router";

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import PaymentPage from "@pages/payment/ui/PaymentPage";

const navigate = vi.hoisted(() => vi.fn());
const usePaymentPage = vi.hoisted(() => vi.fn());

vi.mock("react-router", async () => {
  const actual = await vi.importActual<typeof import("react-router")>("react-router");
  return { ...actual, useNavigate: () => navigate };
});
vi.mock("@pages/payment/model/use-payment-page", () => ({ usePaymentPage }));
vi.mock("@features/payment", () => ({
  PaymentOrderSummary: () => <div>주문 요약</div>,
  TossPaymentWidget: () => <div>결제 위젯</div>,
}));

describe("PaymentPage", () => {
  beforeEach(() => {
    navigate.mockReset();
    usePaymentPage.mockReset();
  });

  it.each([
    ["invalid", { isReservationIdValid: false, isLoading: false, errorMessage: null, order: null, user: null }, "잘못된 결제 주문입니다."],
    ["loading", { isReservationIdValid: true, isLoading: true, errorMessage: null, order: null, user: null }, "결제 주문서를 불러오는 중입니다."],
    ["error", { isReservationIdValid: true, isLoading: false, errorMessage: "주문 오류", order: null, user: null }, "주문 오류"],
  ])("%s 상태를 표시한다", (_name, state, message) => {
    usePaymentPage.mockReturnValue(state);

    render(<PaymentPage />);

    expect(screen.getByText(message)).toBeInTheDocument();
  });

  it("주문서와 결제 위젯을 표시하고 뒤로 이동한다", async () => {
    const user = userEvent.setup();
    const handleBack = vi.fn();
    usePaymentPage.mockReturnValue({
      handleBack,
      isReservationIdValid: true,
      isLoading: false,
      errorMessage: null,
      order: {
        orderId: "order-1",
        paymentExpiresAt: "2026-09-16T20:00:00",
      },
      user: { id: 1 },
    });

    render(
      <MemoryRouter>
        <PaymentPage />
      </MemoryRouter>,
    );

    expect(screen.getByText("주문 요약")).toBeInTheDocument();
    expect(screen.getByText("결제 위젯")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "이전 화면으로" }));
    expect(handleBack).toHaveBeenCalledOnce();
  });

  it("오류 메시지가 없으면 기본 설명을 표시한다", () => {
    usePaymentPage.mockReturnValue({ isReservationIdValid: true, isLoading: false, errorMessage: null, order: null, user: null });

    render(<PaymentPage />);

    expect(screen.getByText("잠시 후 다시 시도해 주세요.")).toBeInTheDocument();
  });
});
