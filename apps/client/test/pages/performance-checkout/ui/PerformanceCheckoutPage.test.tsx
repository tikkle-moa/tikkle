import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { useSessionStore } from "@entities/session";

import PerformanceCheckoutPage from "@pages/performance-checkout/ui/PerformanceCheckoutPage";

const navigate = vi.hoisted(() => vi.fn());
const mockUseLocation = vi.hoisted(() => vi.fn());
const mockUseParams = vi.hoisted(() => vi.fn());
const mockUseStartCheckout = vi.hoisted(() => vi.fn());

vi.mock("react-router", async () => {
  const actual = await vi.importActual<typeof import("react-router")>("react-router");
  return {
    ...actual,
    useLocation: mockUseLocation,
    useNavigate: () => navigate,
    useParams: mockUseParams,
  };
});

vi.mock("@features/performance-booking/model/use-start-checkout", () => ({
  useStartCheckout: mockUseStartCheckout,
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
  hold: {
    holdId: "hold-1",
    groupId: "7:10",
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
    mockUseStartCheckout.mockReturnValue({ errorMessage: null, isStarting: false, startCheckout: vi.fn() });
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
    expect(screen.queryByText("B구역 1열 1번")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "예매 정보 확정하기" }));
    expect(mockUseStartCheckout.mock.results[0].value.startCheckout).toHaveBeenCalledOnce();
  });

  it("START_CHECKOUT 성공 시 결제 준비 화면으로 이동한다", () => {
    let onSuccess: ((reservationId: number) => void) | undefined;
    mockUseStartCheckout.mockImplementation(({ onSuccess: callback }: { onSuccess: (reservationId: number) => void }) => {
      onSuccess = callback;
      return { errorMessage: null, isStarting: false, startCheckout: vi.fn() };
    });

    render(<PerformanceCheckoutPage />);
    onSuccess?.(501);

    expect(navigate).toHaveBeenCalledWith("/payments/501/checkout");
  });

  it("예매 상태가 없으면 상세 안내를 표시한다", () => {
    mockUseLocation.mockReturnValue({ state: null });

    render(<PerformanceCheckoutPage />);

    expect(screen.getByRole("heading", { name: "예매 정보를 찾을 수 없습니다." })).toBeInTheDocument();
  });

  it.each([
    ["공연 ID가 URL과 다를 때", { ...validState, performance: { ...performance, id: 9 } }],
    ["Hold의 공연 ID가 URL과 다를 때", { ...validState, hold: { ...validState.hold, performanceId: 9 } }],
    ["공연장 ID가 공연 정보와 다를 때", { ...validState, venue: { ...venue, id: 2 } }],
    ["공연 정보가 불완전할 때", { ...validState, performance: { id: 10, venueId: 1 } }],
    ["공연장 정보가 불완전할 때", { ...validState, venue: { id: 1 } }],
    ["Hold 좌석이 비어 있을 때", { ...validState, hold: { ...validState.hold, venueSeatIds: [] } }],
    ["Hold 좌석이 공연장 좌석에 없을 때", { ...validState, hold: { ...validState.hold, venueSeatIds: [999] } }],
    ["공연장 좌석 정보가 불완전할 때", { ...validState, venueSeats: [{ id: 101 }] }],
    ["공연장 좌석 정보가 올바르지 않을 때", { ...validState, venueSeats: [null] }],
  ])("%s 상세 안내를 표시한다", (_description, state) => {
    mockUseLocation.mockReturnValue({ state });

    render(<PerformanceCheckoutPage />);

    expect(screen.getByRole("heading", { name: "예매 정보를 찾을 수 없습니다." })).toBeInTheDocument();
  });

  it("점유 시간이 만료되면 확정 버튼을 비활성화한다", () => {
    mockUseLocation.mockReturnValue({
      state: { ...validState, hold: { ...validState.hold, expiresAt: new Date(Date.now() - 1_000).toISOString() } },
    });

    render(<PerformanceCheckoutPage />);

    expect(screen.getByText("좌석 점유 남은 시간 00:00")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "예매 정보 확정하기" })).toBeDisabled();
  });

  it("로그인 사용자 정보가 없으면 확정 버튼을 비활성화한다", () => {
    useSessionStore.setState({ user: null, status: "unauthenticated", justLoggedOut: false });

    render(<PerformanceCheckoutPage />);

    expect(screen.getByText("예매자 정보를 불러오는 중입니다.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "예매 정보 확정하기" })).toBeDisabled();
  });

  it("예매 정보 확정 중이면 진행 상태와 오류 메시지를 표시한다", () => {
    mockUseStartCheckout.mockReturnValue({
      errorMessage: "결제 준비를 시작하지 못했습니다.",
      isStarting: true,
      startCheckout: vi.fn(),
    });

    render(<PerformanceCheckoutPage />);

    expect(screen.getByRole("button", { name: "예매 정보 확정 중..." })).toBeDisabled();
    expect(screen.getByRole("alert")).toHaveTextContent("결제 준비를 시작하지 못했습니다.");
  });

  it("좌석 다시 선택을 누르면 이전 페이지로 돌아간다", async () => {
    const user = userEvent.setup();
    render(<PerformanceCheckoutPage />);

    await user.click(screen.getByRole("button", { name: "좌석 다시 선택" }));

    expect(navigate).toHaveBeenCalledWith(-1);
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
      state: { ...validState, hold: { ...validState.hold, expiresAt: new Date(300_000).toISOString() } },
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
