import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { useSessionStore } from "@entities/session";

import PerformanceCheckoutPage from "@pages/performance-checkout/ui/PerformanceCheckoutPage";

const mockUseLocation = vi.hoisted(() => vi.fn());
const mockUseParams = vi.hoisted(() => vi.fn());
const mockUsePerformanceCheckoutNavigation = vi.hoisted(() => vi.fn());
const mockStartCheckout = vi.hoisted(() => vi.fn());
const mockHandleReturnToSeats = vi.hoisted(() => vi.fn());
const mockHandleLeaveReview = vi.hoisted(() => vi.fn());
const mockHandleStayOnReview = vi.hoisted(() => vi.fn());
const mockPerformanceCheckoutNavigationDialog = vi.hoisted(() => vi.fn());

vi.mock("react-router", async () => {
  const actual = await vi.importActual<typeof import("react-router")>("react-router");
  return {
    ...actual,
    useLocation: mockUseLocation,
    useParams: mockUseParams,
  };
});

vi.mock("@pages/performance-checkout/model/use-performance-checkout-navigation", () => ({
  usePerformanceCheckoutNavigation: mockUsePerformanceCheckoutNavigation,
}));
vi.mock("@pages/performance-checkout/ui/PerformanceCheckoutNavigationDialog", () => ({
  default: mockPerformanceCheckoutNavigationDialog,
}));

const performance = {
  id: 10,
  concertId: 20,
  venueId: 1,
  name: "Tikkle Live",
  startsAt: "2026-09-01T19:00:00",
  bookingOpensAt: null,
  createdAt: "2026-08-25T12:00:00",
  status: "AVAILABLE",
};
const venue = { id: 1, name: "올림픽공원 KSPO DOME" };
const venueSeats = [
  {
    id: 101,
    venueId: 1,
    sectionName: "A구역",
    seatNumber: 1,
    seatLabel: "A구역 1열 1번",
    price: 150_000,
    positionX: 20,
    positionY: 28,
    createdAt: "2026-08-25T12:00:00",
  },
  {
    id: 102,
    venueId: 1,
    sectionName: "A구역",
    seatNumber: 2,
    seatLabel: "A구역 1열 2번",
    price: 120_000,
    positionX: 23,
    positionY: 28,
    createdAt: "2026-08-25T12:00:00",
  },
  {
    id: 103,
    venueId: 1,
    sectionName: "B구역",
    seatNumber: 1,
    seatLabel: "B구역 1열 1번",
    price: 100_000,
    positionX: 40,
    positionY: 28,
    createdAt: "2026-08-25T12:00:00",
  },
];
const validState = {
  performance,
  venue,
  venueSeats,
  review: {
    reviewToken: "92334384-52d0-41f2-a3c1-3d54047c35b8",
    scopeId: "7:10",
    performanceId: 10,
    venueSeatIds: [101, 102],
    expiresAt: new Date(Date.now() + 300_000).toISOString(),
  },
};

describe("PerformanceCheckoutPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(window, "setInterval").mockImplementation(() => 1 as unknown as number);
    vi.spyOn(window, "clearInterval").mockImplementation(() => undefined);
    mockUseParams.mockReturnValue({ performanceId: "10" });
    mockUseLocation.mockReturnValue({ state: validState });
    mockUsePerformanceCheckoutNavigation.mockReturnValue({
      checkoutErrorMessage: null,
      isStarting: false,
      isEnding: false,
      reviewErrorMessage: null,
      isNavigationBlocked: false,
      startCheckout: mockStartCheckout,
      handleReturnToSeats: mockHandleReturnToSeats,
      handleLeaveReview: mockHandleLeaveReview,
      handleStayOnReview: mockHandleStayOnReview,
    });
    mockPerformanceCheckoutNavigationDialog.mockImplementation(() => <div role="dialog">예매 정보 확인 종료 경고</div>);
    useSessionStore.setState({
      user: { id: 7, nickname: "티끌 사용자", email: "user@tikkle.test" } as never,
      status: "authenticated",
      justLoggedOut: false,
    });
  });

  afterEach(() => {
    act(() => {
      useSessionStore.setState({ user: null, status: "loading", justLoggedOut: false });
    });
    vi.restoreAllMocks();
  });

  it("예매자와 공연, 좌석 정보를 확인하고 확정 요청을 보낸다", async () => {
    const user = userEvent.setup();
    render(<PerformanceCheckoutPage />);

    expect(screen.getByRole("heading", { name: "예매자와 공연 정보를 확인해 주세요" })).toBeInTheDocument();
    expect(screen.getByText("티끌 사용자 · user@tikkle.test")).toBeInTheDocument();
    expect(screen.getByText("Tikkle Live")).toBeInTheDocument();
    expect(screen.getByText("올림픽공원 KSPO DOME")).toBeInTheDocument();
    expect(screen.getByText("270,000원")).toBeInTheDocument();
    expect(screen.getByRole("note")).toHaveTextContent(
      "결제 화면에서 돌아가도 해당 좌석은 만료 시간까지 유지되며, 다른 좌석을 새로 선택할 수 있습니다.",
    );
    expect(screen.queryByText("B구역 1열 1번")).not.toBeInTheDocument();
    expect(mockUsePerformanceCheckoutNavigation).toHaveBeenCalledWith({ performanceId: 10, review: validState.review });

    await user.click(screen.getByRole("button", { name: "예매 정보 확정하기" }));
    expect(mockStartCheckout).toHaveBeenCalledOnce();
  });

  it("예매 상태가 없으면 상세 안내를 표시한다", () => {
    mockUseLocation.mockReturnValue({ state: null });

    render(<PerformanceCheckoutPage />);

    expect(screen.getByRole("heading", { name: "예매 정보를 찾을 수 없습니다." })).toBeInTheDocument();
  });

  it.each([
    ["공연 ID가 URL과 다를 때", { ...validState, performance: { ...performance, id: 9 } }],
    ["점유 스냅샷의 공연 ID가 URL과 다를 때", { ...validState, review: { ...validState.review, performanceId: 9 } }],
    ["공연장 ID가 공연 정보와 다를 때", { ...validState, venue: { ...venue, id: 2 } }],
    ["공연 정보가 불완전할 때", { ...validState, performance: { id: 10, venueId: 1 } }],
    ["공연장 정보가 불완전할 때", { ...validState, venue: { id: 1 } }],
    ["점유 스냅샷 좌석이 비어 있을 때", { ...validState, review: { ...validState.review, venueSeatIds: [] } }],
    ["점유 스냅샷 좌석이 공연장 좌석에 없을 때", { ...validState, review: { ...validState.review, venueSeatIds: [999] } }],
    ["공연장 좌석 정보가 불완전할 때", { ...validState, venueSeats: [{ id: 101 }] }],
    ["공연장 좌석 정보가 올바르지 않을 때", { ...validState, venueSeats: [null] }],
  ])("%s 상세 안내를 표시한다", (_description, state) => {
    mockUseLocation.mockReturnValue({ state });

    render(<PerformanceCheckoutPage />);

    expect(screen.getByRole("heading", { name: "예매 정보를 찾을 수 없습니다." })).toBeInTheDocument();
  });

  it("점유 시간이 지나도 결제 준비 결과를 다시 확인할 수 있다", () => {
    mockUseLocation.mockReturnValue({
      state: { ...validState, review: { ...validState.review, expiresAt: new Date(Date.now() - 1_000).toISOString() } },
    });

    render(<PerformanceCheckoutPage />);

    expect(screen.getByText("선택 당시 점유 시간이 지났습니다. 확정 요청 시 서버 상태를 다시 확인합니다.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "예매 정보 확정하기" })).toBeEnabled();
  });

  it("로그인 사용자 정보가 없으면 확정 버튼을 비활성화한다", () => {
    useSessionStore.setState({ user: null, status: "unauthenticated", justLoggedOut: false });

    render(<PerformanceCheckoutPage />);

    expect(screen.getByText("예매자 정보를 불러오는 중입니다.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "예매 정보 확정하기" })).toBeDisabled();
  });

  it("예매 정보 확정 중이면 진행 상태와 오류 메시지를 표시한다", () => {
    mockUsePerformanceCheckoutNavigation.mockReturnValue({
      checkoutErrorMessage: "결제 준비를 시작하지 못했습니다.",
      isStarting: true,
      isEnding: false,
      reviewErrorMessage: null,
      isNavigationBlocked: false,
      startCheckout: mockStartCheckout,
      handleReturnToSeats: mockHandleReturnToSeats,
      handleLeaveReview: mockHandleLeaveReview,
      handleStayOnReview: mockHandleStayOnReview,
    });

    render(<PerformanceCheckoutPage />);

    expect(screen.getByRole("button", { name: "예매 정보 확정 중..." })).toBeDisabled();
    expect(screen.getByRole("alert")).toHaveTextContent("결제 준비를 시작하지 못했습니다.");
  });

  it("좌석 다시 선택은 예매 흐름 훅의 종료 동작을 호출한다", async () => {
    const user = userEvent.setup();
    render(<PerformanceCheckoutPage />);

    await user.click(screen.getByRole("button", { name: "좌석 다시 선택" }));

    expect(mockHandleReturnToSeats).toHaveBeenCalledOnce();
  });

  it("리뷰 잠금 해제 중에는 다시 누를 수 없고 서버 오류를 표시한다", () => {
    mockUsePerformanceCheckoutNavigation.mockReturnValue({
      checkoutErrorMessage: null,
      isEnding: true,
      isStarting: false,
      reviewErrorMessage: "예매 정보 확인 종료에 실패했습니다.",
      isNavigationBlocked: false,
      startCheckout: mockStartCheckout,
      handleReturnToSeats: mockHandleReturnToSeats,
      handleLeaveReview: mockHandleLeaveReview,
      handleStayOnReview: mockHandleStayOnReview,
    });

    render(<PerformanceCheckoutPage />);

    expect(screen.getByRole("button", { name: "좌석 선택으로 돌아가는 중..." })).toBeDisabled();
    expect(screen.getByRole("alert")).toHaveTextContent("예매 정보 확인 종료에 실패했습니다.");
  });

  it("브라우저 이동이 차단되면 리뷰 종료 경고를 표시한다", () => {
    mockUsePerformanceCheckoutNavigation.mockReturnValue({
      checkoutErrorMessage: null,
      isStarting: false,
      isEnding: false,
      reviewErrorMessage: null,
      isNavigationBlocked: true,
      startCheckout: mockStartCheckout,
      handleReturnToSeats: mockHandleReturnToSeats,
      handleLeaveReview: mockHandleLeaveReview,
      handleStayOnReview: mockHandleStayOnReview,
    });

    render(<PerformanceCheckoutPage />);

    expect(screen.getByRole("dialog")).toHaveTextContent("예매 정보 확인 종료 경고");
  });

  it("타이머 콜백이 실행되면 점유 남은 시간을 갱신한다", () => {
    const now = vi.spyOn(Date, "now").mockReturnValueOnce(0).mockReturnValue(1_000);
    let tick: (() => void) | undefined;
    const setIntervalSpy = vi.spyOn(window, "setInterval").mockImplementation((callback) => {
      tick = callback as () => void;
      return 1 as unknown as number;
    });
    const clearIntervalSpy = vi.spyOn(window, "clearInterval").mockImplementation(() => undefined);
    mockUseLocation.mockReturnValue({
      state: { ...validState, review: { ...validState.review, expiresAt: new Date(300_000).toISOString() } },
    });

    const { unmount } = render(<PerformanceCheckoutPage />);
    act(() => tick?.());

    expect(screen.getByText("좌석 점유 남은 시간 04:59")).toBeInTheDocument();
    unmount();
    setIntervalSpy.mockImplementation(() => 1 as unknown as number);
    clearIntervalSpy.mockImplementation(() => undefined);
    now.mockRestore();
  });
});
