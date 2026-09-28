import { MemoryRouter } from "react-router";

import { render, screen } from "@testing-library/react";

import PaymentSuccessPage from "@pages/payment/ui/PaymentSuccessPage";

const mockUsePaymentSuccessPage = vi.hoisted(() => vi.fn());

vi.mock("@pages/payment/model/use-payment-success-page", () => ({
  usePaymentSuccessPage: mockUsePaymentSuccessPage,
}));

const renderPage = () =>
  render(
    <MemoryRouter>
      <PaymentSuccessPage />
    </MemoryRouter>,
  );

describe("PaymentSuccessPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("승인 정보가 없으면 오류 안내를 표시한다", () => {
    mockUsePaymentSuccessPage.mockReturnValue({ errorMessage: null, isRequestValid: false, status: "pending" });

    renderPage();

    expect(screen.getByRole("heading", { name: "결제 승인 정보가 올바르지 않습니다." })).toBeInTheDocument();
  });

  it("승인 요청 중이면 대기 안내를 표시한다", () => {
    mockUsePaymentSuccessPage.mockReturnValue({ errorMessage: null, isRequestValid: true, status: "pending" });

    renderPage();

    expect(screen.getByRole("heading", { name: "결제를 확인하고 있습니다." })).toBeInTheDocument();
  });

  it("승인에 실패하면 서버 오류 메시지를 표시한다", () => {
    mockUsePaymentSuccessPage.mockReturnValue({ errorMessage: "승인 시간이 만료되었습니다.", isRequestValid: true, status: "failed" });

    renderPage();

    expect(screen.getByRole("heading", { name: "결제 승인에 실패했습니다." })).toBeInTheDocument();
    expect(screen.getByText("승인 시간이 만료되었습니다.")).toBeInTheDocument();
  });

  it("승인 오류 메시지가 없으면 기본 안내를 표시한다", () => {
    mockUsePaymentSuccessPage.mockReturnValue({ errorMessage: null, isRequestValid: true, status: "failed" });

    renderPage();

    expect(screen.getByText("결제 내역에서 상태를 다시 확인해 주세요.")).toBeInTheDocument();
  });

  it("승인 성공 시 예매 내역 링크를 표시한다", () => {
    mockUsePaymentSuccessPage.mockReturnValue({ errorMessage: null, isRequestValid: true, status: "succeeded" });

    renderPage();

    expect(screen.getByRole("heading", { name: "예매가 완료되었습니다" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "예매 내역 보기" })).toHaveAttribute("href", "/my/reservations");
  });
});
