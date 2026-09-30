import { MemoryRouter } from "react-router";

import { renderHook } from "@testing-library/react";

import { usePaymentFailPage } from "@pages/payment/model/use-payment-fail-page";
import { usePaymentSuccessPage } from "@pages/payment/model/use-payment-success-page";

const { usePaymentResult } = vi.hoisted(() => ({ usePaymentResult: vi.fn() }));

vi.mock("@features/payment", () => ({ usePaymentResult }));

describe("payment result page hooks", () => {
  beforeEach(() => {
    usePaymentResult.mockReturnValue({ status: "pending", errorMessage: null });
  });

  it.each([
    ["", false],
    ["?paymentKey=key&orderId=order&amount=0", false],
    ["?paymentKey=key&orderId=order&amount=15000", true],
  ])("성공 결제 query %s의 유효성을 계산한다", (search, isRequestValid) => {
    usePaymentResult.mockClear();
    const { result } = renderHook(() => usePaymentSuccessPage(), {
      wrapper: ({ children }) => <MemoryRouter initialEntries={[`/payments/success${search}`]}>{children}</MemoryRouter>,
    });

    expect(result.current.isRequestValid).toBe(isRequestValid);
    expect(usePaymentResult).toHaveBeenLastCalledWith(
      isRequestValid ? { request: { action: "CONFIRM_PAYMENT", data: { paymentKey: "key", orderId: "order", amount: 15000 } } } : { request: null },
    );
  });

  it.each([
    ["", false],
    ["?reservationId=0", false],
    ["?reservationId=501", true],
  ])("실패 결제 query %s의 유효성을 계산한다", (search, isRequestValid) => {
    usePaymentResult.mockClear();

    const { result } = renderHook(() => usePaymentFailPage(), {
      wrapper: ({ children }) => <MemoryRouter initialEntries={[`/payments/fail${search}`]}>{children}</MemoryRouter>,
    });

    expect(result.current.isRequestValid).toBe(isRequestValid);
    expect(usePaymentResult).toHaveBeenLastCalledWith(
      isRequestValid ? { request: { action: "CANCEL_PAYMENT", data: { reservationId: 501 } } } : { request: null },
    );
  });
});
