import { renderHook } from "@testing-library/react";

import { usePaymentSuccessPage } from "@pages/payment/model/use-payment-success-page";

const mockUseSearchParams = vi.hoisted(() => vi.fn());
const mockUsePaymentResult = vi.hoisted(() => vi.fn());

vi.mock("react-router", async () => {
  const actual = await vi.importActual<typeof import("react-router")>("react-router");
  return { ...actual, useSearchParams: mockUseSearchParams };
});

vi.mock("@features/payment", () => ({
  usePaymentResult: mockUsePaymentResult,
}));

describe("usePaymentSuccessPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUsePaymentResult.mockReturnValue({ errorMessage: null, status: "pending" });
  });

  it.each([
    ["paymentKey가 없을 때", "orderId=tikkle-order&amount=1000"],
    ["orderId가 없을 때", "paymentKey=payment-key&amount=1000"],
    ["금액이 0일 때", "paymentKey=payment-key&orderId=tikkle-order&amount=0"],
    ["금액이 정수가 아닐 때", "paymentKey=payment-key&orderId=tikkle-order&amount=1.5"],
  ])("$0 승인 요청을 만들지 않는다", (_label, query) => {
    mockUseSearchParams.mockReturnValue([new URLSearchParams(query)]);

    const { result } = renderHook(() => usePaymentSuccessPage());

    expect(result.current).toEqual({ isRequestValid: false, errorMessage: null, status: "pending" });
    expect(mockUsePaymentResult).toHaveBeenCalledWith({ request: null });
  });

  it("결제 승인 정보로 승인 요청을 만든다", () => {
    mockUseSearchParams.mockReturnValue([new URLSearchParams("paymentKey=payment-key&orderId=tikkle-order&amount=132000")]);

    const { result } = renderHook(() => usePaymentSuccessPage());

    expect(result.current).toEqual({ isRequestValid: true, errorMessage: null, status: "pending" });
    expect(mockUsePaymentResult).toHaveBeenCalledWith({
      request: {
        action: "CONFIRM_PAYMENT",
        data: { paymentKey: "payment-key", orderId: "tikkle-order", amount: 132_000 },
      },
    });
  });
});
