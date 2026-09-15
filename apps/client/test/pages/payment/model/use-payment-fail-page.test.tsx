import { renderHook } from "@testing-library/react";

import { usePaymentFailPage } from "@pages/payment/model/use-payment-fail-page";

const mockUseSearchParams = vi.hoisted(() => vi.fn());
const mockUsePaymentResult = vi.hoisted(() => vi.fn());

vi.mock("react-router", async () => {
  const actual = await vi.importActual<typeof import("react-router")>("react-router");
  return { ...actual, useSearchParams: mockUseSearchParams };
});

vi.mock("@features/payment", () => ({
  usePaymentResult: mockUsePaymentResult,
}));

describe("usePaymentFailPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUsePaymentResult.mockReturnValue({ errorMessage: null, status: "pending" });
  });

  it.each([
    ["쿼리 파라미터가 없을 때", ""],
    ["예약 번호가 숫자가 아닐 때", "reservationId=invalid"],
    ["예약 번호가 0일 때", "reservationId=0"],
  ])("$0 취소 요청을 만들지 않는다", (_label, query) => {
    mockUseSearchParams.mockReturnValue([new URLSearchParams(query)]);

    const { result } = renderHook(() => usePaymentFailPage());

    expect(result.current).toEqual({ isRequestValid: false, errorMessage: null, status: "pending" });
    expect(mockUsePaymentResult).toHaveBeenCalledWith({ request: null });
  });

  it("유효한 예약 번호로 결제 취소 요청을 만든다", () => {
    mockUseSearchParams.mockReturnValue([new URLSearchParams("reservationId=501")]);

    const { result } = renderHook(() => usePaymentFailPage());

    expect(result.current).toEqual({ isRequestValid: true, errorMessage: null, status: "pending" });
    expect(mockUsePaymentResult).toHaveBeenCalledWith({
      request: { action: "CANCEL_PAYMENT", data: { reservationId: 501 } },
    });
  });
});
