import { act, renderHook } from "@testing-library/react";

import { usePaymentPage } from "@pages/payment/model/use-payment-page";

const navigate = vi.hoisted(() => vi.fn());
const mockUseLocation = vi.hoisted(() => vi.fn());
const mockUseParams = vi.hoisted(() => vi.fn());
const mockUsePaymentOrder = vi.hoisted(() => vi.fn());
const mockUseSessionStore = vi.hoisted(() => vi.fn());

vi.mock("react-router", async () => {
  const actual = await vi.importActual<typeof import("react-router")>("react-router");
  return { ...actual, useLocation: mockUseLocation, useNavigate: () => navigate, useParams: mockUseParams };
});

vi.mock("@entities/session", () => ({
  useSessionStore: mockUseSessionStore,
}));

vi.mock("@features/payment", () => ({
  isPaymentOrder: vi.fn((value) => value?.orderId === "fixture-order"),
  usePaymentOrder: mockUsePaymentOrder,
}));

describe("usePaymentPage", () => {
  const user = { id: 7, nickname: "티끌 사용자", email: "user@tikkle.test" };
  const paymentOrder = { order: null, errorMessage: null, isLoading: true };

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseParams.mockReturnValue({ reservationId: "501" });
    mockUseLocation.mockReturnValue({ state: null });
    mockUseSessionStore.mockImplementation((selector) => selector({ user }));
    mockUsePaymentOrder.mockReturnValue(paymentOrder);
  });

  it("유효한 결제 주문 번호를 사용하고 이전 화면으로 돌아간다", () => {
    const { result } = renderHook(() => usePaymentPage());

    expect(result.current).toMatchObject({
      isReservationIdValid: true,
      user,
      ...paymentOrder,
    });
    expect(mockUsePaymentOrder).toHaveBeenCalledWith({ reservationId: 501, initialOrder: undefined });

    act(() => result.current.handleBack());

    expect(navigate).toHaveBeenCalledWith(-1);
  });

  it.each(["invalid", "0", "-1"])("예약 번호가 %s이면 유효하지 않다", (reservationId) => {
    mockUseParams.mockReturnValue({ reservationId });

    const { result } = renderHook(() => usePaymentPage());

    expect(result.current.isReservationIdValid).toBe(false);
    expect(mockUsePaymentOrder).toHaveBeenCalledWith({ reservationId: Number(reservationId), initialOrder: undefined });
  });

  it("이전 화면에서 전달한 주문서를 초기 주문으로 사용한다", () => {
    const initialOrder = { orderId: "fixture-order", reservationId: 501 };
    mockUseLocation.mockReturnValue({ state: initialOrder });

    const { result } = renderHook(() => usePaymentPage());

    expect(result.current.isReservationIdValid).toBe(true);
    expect(mockUsePaymentOrder).toHaveBeenCalledWith({ reservationId: 501, initialOrder });
  });
});
