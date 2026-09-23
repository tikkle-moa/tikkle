import { MemoryRouter } from "react-router";

import { render, screen } from "@testing-library/react";

import PaymentFailPage from "@pages/payment/ui/PaymentFailPage";

const mockUsePaymentFailPage = vi.hoisted(() => vi.fn());

vi.mock("@pages/payment/model/use-payment-fail-page", () => ({
  usePaymentFailPage: mockUsePaymentFailPage,
}));

const renderPage = () =>
  render(
    <MemoryRouter>
      <PaymentFailPage />
    </MemoryRouter>,
  );

describe("PaymentFailPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("취소 정보가 없으면 오류 안내를 표시한다", () => {
    mockUsePaymentFailPage.mockReturnValue({ errorMessage: null, isRequestValid: false, status: "pending" });

    renderPage();

    expect(screen.getByRole("heading", { name: "취소할 결제 주문을 찾지 못했습니다." })).toBeInTheDocument();
  });

  it("취소 요청 중이면 대기 안내를 표시한다", () => {
    mockUsePaymentFailPage.mockReturnValue({ errorMessage: null, isRequestValid: true, status: "pending" });

    renderPage();

    expect(screen.getByRole("heading", { name: "결제 취소를 처리하고 있습니다." })).toBeInTheDocument();
  });

  it("취소에 실패하면 서버 오류 메시지를 표시한다", () => {
    mockUsePaymentFailPage.mockReturnValue({ errorMessage: "이미 처리된 결제입니다.", isRequestValid: true, status: "failed" });

    renderPage();

    expect(screen.getByRole("heading", { name: "결제 취소를 확인하지 못했습니다." })).toBeInTheDocument();
    expect(screen.getByText("이미 처리된 결제입니다.")).toBeInTheDocument();
  });

  it("취소 오류 메시지가 없으면 기본 안내를 표시한다", () => {
    mockUsePaymentFailPage.mockReturnValue({ errorMessage: null, isRequestValid: true, status: "failed" });

    renderPage();

    expect(screen.getByText("예매 내역에서 상태를 다시 확인해 주세요.")).toBeInTheDocument();
  });

  it("취소 완료 시 홈 링크를 표시한다", () => {
    mockUsePaymentFailPage.mockReturnValue({ errorMessage: null, isRequestValid: true, status: "succeeded" });

    renderPage();

    expect(screen.getByRole("heading", { name: "결제가 취소되었습니다" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "홈으로 이동" })).toHaveAttribute("href", "/");
  });
});
