import { MemoryRouter } from "react-router";

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import PaymentPage from "@pages/payment/ui/PaymentPage";

const mockUsePaymentPage = vi.hoisted(() => vi.fn());
const mockPaymentOrderSummary = vi.hoisted(() => vi.fn());
const mockTossPaymentWidget = vi.hoisted(() => vi.fn());

vi.mock("@pages/payment/model/use-payment-page", () => ({
  usePaymentPage: mockUsePaymentPage,
}));

vi.mock("@features/payment", () => ({
  PaymentOrderSummary: mockPaymentOrderSummary,
  TossPaymentWidget: mockTossPaymentWidget,
}));

const order = {
  reservationId: 501,
  orderId: "tikkle-501",
  orderName: "Tikkle Live 1석",
  amount: 150_000,
  paymentExpiresAt: "2026-09-15T13:30:00.000Z",
  concertTitle: "Tikkle Live",
  posterUrl: null,
  performanceName: "Tikkle Live 1회차",
  performanceStartsAt: "2026-09-15T19:00:00",
  venueName: "티클홀",
  seats: [],
};
const user = { id: 7, nickname: "티끌 사용자", email: "user@tikkle.test" };

const renderPage = () =>
  render(
    <MemoryRouter>
      <PaymentPage />
    </MemoryRouter>,
  );

describe("PaymentPage", () => {
  const handleBack = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockUsePaymentPage.mockReturnValue({
      handleBack,
      errorMessage: null,
      isLoading: false,
      isReservationIdValid: true,
      order,
      user,
    });
    mockPaymentOrderSummary.mockImplementation(() => <div data-testid="payment-order-summary" />);
    mockTossPaymentWidget.mockImplementation(() => <div data-testid="toss-payment-widget" />);
  });

  it("주문서와 결제수단을 표시하고 이전 화면으로 돌아간다", async () => {
    const userEventInstance = userEvent.setup();
    renderPage();

    expect(screen.getByRole("heading", { name: "주문서를 확인해 주세요" })).toBeInTheDocument();
    expect(screen.getByTestId("payment-order-summary")).toBeInTheDocument();
    expect(screen.getByTestId("toss-payment-widget")).toBeInTheDocument();

    await userEventInstance.click(screen.getByRole("button", { name: "이전 화면으로" }));
    expect(handleBack).toHaveBeenCalledOnce();
    expect(mockUsePaymentPage).toHaveBeenCalledWith();
  });

  it("예약 번호가 올바르지 않으면 오류 안내를 표시한다", () => {
    mockUsePaymentPage.mockReturnValue({
      handleBack,
      errorMessage: null,
      isLoading: false,
      isReservationIdValid: false,
      order: null,
      user: null,
    });

    renderPage();

    expect(screen.getByRole("heading", { name: "잘못된 결제 주문입니다." })).toBeInTheDocument();
  });

  it("주문서를 불러오는 중이면 로딩 안내를 표시한다", () => {
    mockUsePaymentPage.mockReturnValue({
      handleBack,
      errorMessage: null,
      isLoading: true,
      isReservationIdValid: true,
      order: null,
      user,
    });

    renderPage();

    expect(screen.getByRole("heading", { name: "결제 주문서를 불러오는 중입니다." })).toBeInTheDocument();
  });

  it("주문서 오류 메시지를 표시한다", () => {
    mockUsePaymentPage.mockReturnValue({
      handleBack,
      errorMessage: "결제 주문을 찾을 수 없습니다.",
      isLoading: false,
      isReservationIdValid: true,
      order: null,
      user,
    });

    renderPage();

    expect(screen.getByRole("heading", { name: "결제 주문서를 불러오지 못했습니다." })).toBeInTheDocument();
    expect(screen.getByText("결제 주문을 찾을 수 없습니다.")).toBeInTheDocument();
  });

  it("주문서나 사용자 정보가 없으면 기본 오류 안내를 표시한다", () => {
    mockUsePaymentPage.mockReturnValue({
      handleBack,
      errorMessage: null,
      isLoading: false,
      isReservationIdValid: true,
      order: null,
      user: null,
    });

    renderPage();

    expect(screen.getByText("잠시 후 다시 시도해 주세요.")).toBeInTheDocument();
  });

  it("로그인 사용자 정보가 없으면 주문서를 표시하지 않는다", () => {
    mockUsePaymentPage.mockReturnValue({
      handleBack,
      errorMessage: null,
      isLoading: false,
      isReservationIdValid: true,
      order,
      user: null,
    });

    renderPage();

    expect(screen.getByRole("heading", { name: "결제 주문서를 불러오지 못했습니다." })).toBeInTheDocument();
  });
});
