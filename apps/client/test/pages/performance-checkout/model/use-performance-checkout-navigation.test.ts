import { act, renderHook } from "@testing-library/react";

import type { PerformanceCheckoutLocationState } from "@features/performance-booking";

import { usePerformanceCheckoutNavigation } from "@pages/performance-checkout/model/use-performance-checkout-navigation";

const navigate = vi.hoisted(() => vi.fn());
const useBlocker = vi.hoisted(() => vi.fn());
const mockUseCheckoutReview = vi.hoisted(() => vi.fn());
const mockUseStartCheckout = vi.hoisted(() => vi.fn());

vi.mock("react-router", async () => {
  const actual = await vi.importActual<typeof import("react-router")>("react-router");
  return { ...actual, useBlocker, useNavigate: () => navigate };
});

vi.mock("@features/performance-booking", () => ({
  useCheckoutReview: mockUseCheckoutReview,
  useStartCheckout: mockUseStartCheckout,
}));

const review: PerformanceCheckoutLocationState["review"] = {
  reviewToken: "review-token",
  scopeId: "7:10",
  performanceId: 10,
  venueSeatIds: [101],
  expiresAt: "2026-09-28T12:00:00",
};

describe("usePerformanceCheckoutNavigation", () => {
  const proceed = vi.fn();
  const reset = vi.fn();
  const endReview = vi.fn();
  let onEndSuccess: (() => void) | undefined;
  let onCheckoutSuccess: ((reservationId: number) => void) | undefined;
  let blockerState: "blocked" | "unblocked";
  let checkoutReviewErrorMessage: string | null;
  let isEnding: boolean;

  beforeEach(() => {
    vi.clearAllMocks();
    onEndSuccess = undefined;
    onCheckoutSuccess = undefined;
    blockerState = "unblocked";
    checkoutReviewErrorMessage = null;
    isEnding = false;
    reset.mockImplementation(() => {
      blockerState = "unblocked";
    });
    useBlocker.mockImplementation(() => ({ state: blockerState, proceed, reset }));
    mockUseCheckoutReview.mockImplementation(({ onEndSuccess: callback }: { onEndSuccess: () => void }) => {
      onEndSuccess = callback;
      return { errorMessage: checkoutReviewErrorMessage, isEnding, endReview };
    });
    mockUseStartCheckout.mockImplementation(({ onSuccess }: { onSuccess: (reservationId: number) => void }) => {
      onCheckoutSuccess = onSuccess;
      return { errorMessage: null, isStarting: false, startCheckout: vi.fn() };
    });
  });

  const blockNavigation = (historyAction: "POP" | "PUSH", rerender: () => void) => {
    const shouldBlockNavigation = useBlocker.mock.calls[useBlocker.mock.calls.length - 1][0] as (transition: {
      historyAction: "POP" | "PUSH";
    }) => boolean;

    act(() => {
      expect(shouldBlockNavigation({ historyAction })).toBe(true);
      blockerState = "blocked";
      rerender();
    });
  };

  it("예매 정보 확인이 유효하면 브라우저 경로 이탈을 가로챈다", () => {
    renderHook(() => usePerformanceCheckoutNavigation({ performanceId: 10, review }));

    const shouldBlockNavigation = useBlocker.mock.calls[0][0] as (transition: { historyAction: string }) => boolean;

    act(() => expect(shouldBlockNavigation({ historyAction: "PUSH" })).toBe(true));
  });

  it("브라우저 뒤로가기는 경고 없이 END_CHECKOUT_REVIEW 성공 뒤에 진행한다", () => {
    const { result, rerender } = renderHook(() => usePerformanceCheckoutNavigation({ performanceId: 10, review }));

    blockNavigation("POP", rerender);

    expect(endReview).toHaveBeenCalledWith(review.reviewToken);
    expect(proceed).not.toHaveBeenCalled();
    expect(result.current.isNavigationBlocked).toBe(false);

    act(() => onEndSuccess?.());

    expect(proceed).toHaveBeenCalledOnce();
  });

  it("브라우저 뒤로가기 중 END_CHECKOUT_REVIEW가 실패하면 머물러 재시도할 수 있다", () => {
    const { result, rerender } = renderHook(() => usePerformanceCheckoutNavigation({ performanceId: 10, review }));

    blockNavigation("POP", rerender);
    expect(endReview).toHaveBeenCalledOnce();

    act(() => {
      checkoutReviewErrorMessage = "release failed";
      rerender();
      rerender();
    });

    expect(reset).toHaveBeenCalledOnce();
    expect(proceed).not.toHaveBeenCalled();
    expect(result.current.isNavigationBlocked).toBe(false);
  });

  it("브라우저 뒤로가기가 아닌 경로 이동에는 확인 다이얼로그 상태를 유지한다", () => {
    const { result, rerender } = renderHook(() => usePerformanceCheckoutNavigation({ performanceId: 10, review }));

    blockNavigation("PUSH", rerender);

    expect(result.current.isNavigationBlocked).toBe(true);
    expect(endReview).not.toHaveBeenCalled();
  });

  it("브라우저 뒤로가기에서 복귀할 Hold가 없으면 응답 뒤 이동한다", () => {
    const { rerender } = renderHook(() => usePerformanceCheckoutNavigation({ performanceId: 10, review }));

    blockNavigation("POP", rerender);
    expect(proceed).not.toHaveBeenCalled();

    act(() => onEndSuccess?.());

    expect(proceed).toHaveBeenCalledOnce();
  });

  it("좌석 다시 선택은 서버 응답 뒤에만 상세 화면으로 이동한다", () => {
    const { result } = renderHook(() => usePerformanceCheckoutNavigation({ performanceId: 10, review }));

    act(() => result.current.handleReturnToSeats());

    expect(navigate).not.toHaveBeenCalled();
    expect(endReview).toHaveBeenCalledWith(review.reviewToken);

    act(() => onEndSuccess?.());

    expect(navigate).toHaveBeenCalledWith("/performances/10", { replace: true });
  });

  it("결제 준비 성공 시 결제 준비 화면으로 이동한다", () => {
    renderHook(() => usePerformanceCheckoutNavigation({ performanceId: 10, review }));

    act(() => onCheckoutSuccess?.(501));

    expect(navigate).toHaveBeenCalledWith("/payments/501/checkout");
  });

  it("차단된 이동을 취소하면 확인 화면에 머문다", () => {
    const { result } = renderHook(() => usePerformanceCheckoutNavigation({ performanceId: 10, review }));

    act(() => result.current.handleStayOnReview());

    expect(reset).toHaveBeenCalledOnce();
    expect(endReview).not.toHaveBeenCalled();
  });

  it("예매 정보가 없으면 화면 이탈 처리를 요청하지 않는다", () => {
    const { result } = renderHook(() => usePerformanceCheckoutNavigation({ performanceId: 10, review: null }));

    act(() => result.current.handleLeaveReview());

    expect(endReview).not.toHaveBeenCalled();
  });

  it("이동이 차단되지 않은 상태에서는 화면 이탈 처리를 요청하지 않는다", () => {
    const { result } = renderHook(() => usePerformanceCheckoutNavigation({ performanceId: 10, review }));

    act(() => result.current.handleLeaveReview());

    expect(endReview).not.toHaveBeenCalled();
  });

  it("리뷰 종료 중에는 화면 이탈 종료 요청을 중복 전송하지 않는다", () => {
    isEnding = true;
    const { result, rerender } = renderHook(() => usePerformanceCheckoutNavigation({ performanceId: 10, review }));

    blockNavigation("PUSH", rerender);
    act(() => result.current.handleLeaveReview());

    expect(endReview).not.toHaveBeenCalled();
  });

  it("확인 다이얼로그에서 나가기를 선택하면 리뷰 종료를 요청한다", () => {
    const { result, rerender } = renderHook(() => usePerformanceCheckoutNavigation({ performanceId: 10, review }));

    blockNavigation("PUSH", rerender);
    act(() => result.current.handleLeaveReview());

    expect(endReview).toHaveBeenCalledWith(review.reviewToken);
  });

  it("예매 정보가 없으면 좌석 다시 선택 종료 요청을 하지 않는다", () => {
    const { result } = renderHook(() => usePerformanceCheckoutNavigation({ performanceId: 10, review: null }));

    act(() => result.current.handleReturnToSeats());

    expect(endReview).not.toHaveBeenCalled();
    expect(navigate).not.toHaveBeenCalled();
  });

  it("리뷰 종료 중에는 좌석 다시 선택 종료 요청을 중복 전송하지 않는다", () => {
    isEnding = true;
    const { result } = renderHook(() => usePerformanceCheckoutNavigation({ performanceId: 10, review }));

    act(() => result.current.handleReturnToSeats());

    expect(endReview).not.toHaveBeenCalled();
    expect(navigate).not.toHaveBeenCalled();
  });

  it("종료 응답 전에 확인 화면에 머물기로 하면 늦은 응답으로 이동하지 않는다", () => {
    const { result, rerender } = renderHook(() => usePerformanceCheckoutNavigation({ performanceId: 10, review }));

    blockNavigation("PUSH", rerender);
    act(() => result.current.handleLeaveReview());
    expect(endReview).toHaveBeenCalledWith(review.reviewToken);

    act(() => result.current.handleStayOnReview());
    act(() => onEndSuccess?.());

    expect(proceed).not.toHaveBeenCalled();
    expect(navigate).not.toHaveBeenCalled();
  });
});
