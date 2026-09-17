import { MemoryRouter } from "react-router";

import { render, screen } from "@testing-library/react";

import PaymentFailPage from "@pages/payment/ui/PaymentFailPage";
import PaymentSuccessPage from "@pages/payment/ui/PaymentSuccessPage";

const { usePaymentSuccessPage, usePaymentFailPage } = vi.hoisted(() => ({
  usePaymentSuccessPage: vi.fn(),
  usePaymentFailPage: vi.fn(),
}));

vi.mock("@pages/payment/model/use-payment-success-page", () => ({ usePaymentSuccessPage }));
vi.mock("@pages/payment/model/use-payment-fail-page", () => ({ usePaymentFailPage }));

describe("PaymentResultPages", () => {
  beforeEach(() => {
    usePaymentSuccessPage.mockReset();
    usePaymentFailPage.mockReset();
  });

  it.each([
    ["invalid", { isRequestValid: false, status: "pending", errorMessage: null }, "결제 승인 정보가 올바르지 않습니다."],
    ["pending", { isRequestValid: true, status: "pending", errorMessage: null }, "결제를 확인하고 있습니다."],
    ["failed", { isRequestValid: true, status: "failed", errorMessage: "승인 실패" }, "승인 실패"],
    ["failed-default", { isRequestValid: true, status: "failed", errorMessage: null }, "결제 내역에서 상태를 다시 확인해 주세요."],
  ])("성공 페이지의 %s 상태를 표시한다", (_name, state, message) => {
    usePaymentSuccessPage.mockReturnValue(state);

    render(<PaymentSuccessPage />);

    expect(screen.getByText(message)).toBeInTheDocument();
  });

  it("성공 페이지에서 완료 안내와 예약 내역 링크를 표시한다", () => {
    usePaymentSuccessPage.mockReturnValue({ isRequestValid: true, status: "succeeded", errorMessage: null });

    render(
      <MemoryRouter>
        <PaymentSuccessPage />
      </MemoryRouter>,
    );

    expect(screen.getByText("예매가 완료되었습니다")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "예매 내역 보기" })).toHaveAttribute("href", "/my/reservations");
  });

  it.each([
    ["invalid", { isRequestValid: false, status: "pending", errorMessage: null }, "취소할 결제 주문을 찾지 못했습니다."],
    ["pending", { isRequestValid: true, status: "pending", errorMessage: null }, "결제 취소를 처리하고 있습니다."],
    ["failed", { isRequestValid: true, status: "failed", errorMessage: "취소 실패" }, "취소 실패"],
    ["failed-default", { isRequestValid: true, status: "failed", errorMessage: null }, "예매 내역에서 상태를 다시 확인해 주세요."],
  ])("실패 페이지의 %s 상태를 표시한다", (_name, state, message) => {
    usePaymentFailPage.mockReturnValue(state);

    render(<PaymentFailPage />);

    expect(screen.getByText(message)).toBeInTheDocument();
  });

  it("실패 페이지에서 취소 안내와 홈 링크를 표시한다", () => {
    usePaymentFailPage.mockReturnValue({ isRequestValid: true, status: "succeeded", errorMessage: null });

    render(
      <MemoryRouter>
        <PaymentFailPage />
      </MemoryRouter>,
    );

    expect(screen.getByText("결제가 취소되었습니다")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "홈으로 이동" })).toHaveAttribute("href", "/");
  });
});
