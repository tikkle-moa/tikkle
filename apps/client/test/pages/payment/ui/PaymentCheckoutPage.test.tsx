import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import PaymentCheckoutPage from "@pages/payment/ui/PaymentCheckoutPage";

const navigate = vi.hoisted(() => vi.fn());
const mockUseLocation = vi.hoisted(() => vi.fn());
const mockUseParams = vi.hoisted(() => vi.fn());
const mockUsePaymentOrder = vi.hoisted(() => vi.fn());
const mockPaymentOrderSummary = vi.hoisted(() => vi.fn());
const mockPaymentNavigationDialog = vi.hoisted(() => vi.fn());
const mockIsPaymentOrder = vi.hoisted(() => vi.fn());
const mockUsePaymentNavigationGuard = vi.hoisted(() => vi.fn());

vi.mock("react-router", async () => {
  const actual = await vi.importActual<typeof import("react-router")>("react-router");
  return { ...actual, useLocation: mockUseLocation, useNavigate: () => navigate, useParams: mockUseParams };
});

vi.mock("@features/payment", () => ({
  isPaymentOrder: mockIsPaymentOrder,
  PaymentNavigationDialog: mockPaymentNavigationDialog,
  PaymentOrderSummary: mockPaymentOrderSummary,
  usePaymentNavigationGuard: mockUsePaymentNavigationGuard,
}));

vi.mock("@pages/payment/model/use-payment-order", () => ({
  usePaymentOrder: mockUsePaymentOrder,
}));

const order = {
  reservationId: 501,
  orderId: "tikkle-501",
  orderName: "Tikkle Live 2석",
  amount: 270_000,
  paymentExpiresAt: "2026-09-15T13:30:00.000Z",
  concertTitle: "Tikkle Live",
  posterUrl: null,
  performanceName: "Tikkle Live 1회차",
  performanceStartsAt: "2026-09-01T19:00:00",
  venueName: "올림픽공원 KSPO DOME",
  seats: [],
};

describe("PaymentCheckoutPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseParams.mockReturnValue({ reservationId: "501" });
    mockUseLocation.mockReturnValue({ state: null });
    mockIsPaymentOrder.mockReturnValue(false);
    mockUsePaymentOrder.mockReturnValue({ order, errorMessage: null, isLoading: false });
    mockUsePaymentNavigationGuard.mockReturnValue({ isBlocked: false, message: "", proceed: vi.fn(), reset: vi.fn() });
    mockPaymentNavigationDialog.mockImplementation(({ message }: { message: string }) => <div role="dialog">{message}</div>);
    mockPaymentOrderSummary.mockImplementation(({ order: summaryOrder }: { order: typeof order }) => (
      <output data-testid="payment-order-summary">{summaryOrder.orderId}</output>
    ));
  });

  it("서버 주문서를 표시하고 결제 페이지로 이동한다", async () => {
    const user = userEvent.setup();
    render(<PaymentCheckoutPage />);

    expect(screen.getByRole("heading", { name: "결제 주문을 확인해 주세요" })).toBeInTheDocument();
    expect(screen.getByTestId("payment-order-summary")).toHaveTextContent("tikkle-501");

    await user.click(screen.getByRole("button", { name: "결제하러 가기" }));
    expect(navigate).toHaveBeenCalledWith("/payments/501", { state: order });
  });

  it("예매 정보 확인 화면으로 돌아간다", async () => {
    const user = userEvent.setup();
    render(<PaymentCheckoutPage />);

    await user.click(screen.getByRole("button", { name: "예매 정보로 돌아가기" }));

    expect(navigate).toHaveBeenCalledWith(-1);
  });

  it("이탈이 차단되면 공통 결제 경고 UI를 표시한다", () => {
    mockUsePaymentNavigationGuard.mockReturnValue({
      isBlocked: true,
      message: "결제 준비 이후에는 좌석을 변경할 수 없습니다.",
      proceed: vi.fn(),
      reset: vi.fn(),
    });

    render(<PaymentCheckoutPage />);

    expect(screen.getByRole("dialog")).toHaveTextContent("결제 준비 이후에는 좌석을 변경할 수 없습니다.");
  });

  it("예매 정보 확인에서 전달한 fixture 주문을 결제 준비 화면에 표시한다", () => {
    mockIsPaymentOrder.mockReturnValue(true);
    mockUseLocation.mockReturnValue({ state: order });

    render(<PaymentCheckoutPage />);

    expect(mockUsePaymentOrder).toHaveBeenCalledWith({ reservationId: 501, initialOrder: order });
    expect(screen.getByTestId("payment-order-summary")).toHaveTextContent("tikkle-501");
  });

  it("주문 조회 중이면 로딩 안내를 표시한다", () => {
    mockUsePaymentOrder.mockReturnValue({ order: null, errorMessage: null, isLoading: true });

    render(<PaymentCheckoutPage />);

    expect(screen.getByRole("heading", { name: "결제 준비 정보를 불러오는 중입니다." })).toBeInTheDocument();
  });

  it("주문 조회 오류이면 오류 안내를 표시한다", () => {
    mockUsePaymentOrder.mockReturnValue({ order: null, errorMessage: "주문서를 찾을 수 없습니다.", isLoading: false });

    render(<PaymentCheckoutPage />);

    expect(screen.getByRole("heading", { name: "결제 준비 정보를 불러오지 못했습니다." })).toBeInTheDocument();
    expect(screen.getByText("주문서를 찾을 수 없습니다.")).toBeInTheDocument();
  });

  it("주문서가 없고 오류 메시지도 없으면 기본 오류 안내를 표시한다", () => {
    mockUsePaymentOrder.mockReturnValue({ order: null, errorMessage: null, isLoading: false });

    render(<PaymentCheckoutPage />);

    expect(screen.getByText("잠시 후 다시 시도해 주세요.")).toBeInTheDocument();
  });

  it("예약 번호가 올바르지 않으면 잘못된 주문 안내를 표시한다", () => {
    mockUseParams.mockReturnValue({ reservationId: "invalid" });

    render(<PaymentCheckoutPage />);

    expect(screen.getByRole("heading", { name: "잘못된 결제 주문입니다." })).toBeInTheDocument();
  });
});
