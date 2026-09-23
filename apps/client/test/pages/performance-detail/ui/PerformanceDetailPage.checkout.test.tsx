import { MemoryRouter, useLocation } from "react-router";

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { BeginCheckoutReviewMessageData } from "@tikkle/api-types";

import PerformanceDetailPage from "@pages/performance-detail/ui/PerformanceDetailPage";

const { mockUsePerformanceDetail, mockGetPerformanceCheckoutNavigation } = vi.hoisted(() => ({
  mockUsePerformanceDetail: vi.fn(),
  mockGetPerformanceCheckoutNavigation: vi.fn(),
}));

const checkoutReview: BeginCheckoutReviewMessageData = {
  reviewToken: "92334384-52d0-41f2-a3c1-3d54047c35b8",
  groupId: "group-1",
  performanceId: 1,
  venueSeatIds: [101],
  expiresAt: "2026-09-01T20:00:00.000Z",
};

vi.mock("@pages/performance-detail/model/use-performance-detail", () => ({
  usePerformanceDetail: mockUsePerformanceDetail,
}));

vi.mock("@pages/performance-detail/model/performance-detail.utils", () => ({
  getPerformanceCheckoutNavigation: mockGetPerformanceCheckoutNavigation,
  getSeatSelectionSessionId: (state: { performanceId: number; seatSelectionSessionId: string } | null, performanceId: number) =>
    state?.performanceId === performanceId ? state.seatSelectionSessionId : null,
}));

vi.mock("@pages/performance-detail/ui/PerformanceSeatMap", () => ({
  default: ({
    onCheckout,
    seatSelectionSessionId,
  }: {
    onCheckout?: (review: BeginCheckoutReviewMessageData) => void;
    seatSelectionSessionId?: string | null;
  }) => (
    <button type="button" data-session-id={seatSelectionSessionId ?? ""} onClick={() => onCheckout?.(checkoutReview)}>
      예매 정보 확인 테스트
    </button>
  ),
}));

const venue = {
  id: 1,
  name: "올림픽공원 KSPO DOME",
  address: "서울특별시 송파구 올림픽로 424",
  description: "가상 공연장 좌석 배치도입니다.",
  width: 100,
  height: 100,
  stagePositionX: 50,
  stagePositionY: 10,
  stageWidth: 72,
  stageHeight: 13,
  createdAt: "2026-08-25T12:00:00",
};

const pageState = {
  performance: {
    id: 1,
    concertId: 10,
    venueId: 1,
    name: "Tikkle Live",
    startsAt: "2026-09-01T19:00:00",
    bookingOpensAt: "2026-08-28T14:00:00",
    createdAt: "2026-08-25T12:00:00",
    status: "UPCOMING",
  },
  venueDetail: { venue, venueSeats: [] },
  isError: false,
  isParamValid: true,
  isPending: false,
};

const LocationProbe = () => {
  const location = useLocation();

  return (
    <output data-testid="location-path" data-path={location.pathname}>
      {JSON.stringify(location.state)}
    </output>
  );
};

describe("PerformanceDetailPage checkout callback", () => {
  beforeEach(() => {
    mockUsePerformanceDetail.mockReset();
    mockUsePerformanceDetail.mockReturnValue(pageState);
    mockGetPerformanceCheckoutNavigation.mockReset();
    mockGetPerformanceCheckoutNavigation.mockReturnValue({ pathname: "/performances/1/checkout", state: { review: checkoutReview } });
  });

  it("점유한 좌석의 예매 정보 확인 callback으로 checkout 상태를 전달한다", async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <PerformanceDetailPage />
        <LocationProbe />
      </MemoryRouter>,
    );

    await user.click(screen.getByRole("button", { name: "예매 정보 확인 테스트" }));

    expect(screen.getByTestId("location-path")).toHaveAttribute("data-path", "/performances/1/checkout");
    expect(screen.getByTestId("location-path")).toHaveTextContent('"reviewToken":"92334384-52d0-41f2-a3c1-3d54047c35b8"');
  });

  it("같은 공연의 좌석 선택으로 복귀할 때 전달된 세션 ID를 사용한다", () => {
    render(
      <MemoryRouter initialEntries={[{ pathname: "/performances/1", state: { performanceId: 1, seatSelectionSessionId: "session-1" } }]}>
        <PerformanceDetailPage />
      </MemoryRouter>,
    );

    expect(screen.getByRole("button", { name: "예매 정보 확인 테스트" })).toHaveAttribute("data-session-id", "session-1");
  });

  it("예매 정보가 사라진 상태에서는 checkout으로 이동하지 않는다", async () => {
    const user = userEvent.setup();
    mockGetPerformanceCheckoutNavigation.mockReturnValue(null);

    render(
      <MemoryRouter>
        <PerformanceDetailPage />
        <LocationProbe />
      </MemoryRouter>,
    );

    await user.click(screen.getByRole("button", { name: "예매 정보 확인 테스트" }));

    expect(screen.getByTestId("location-path")).toHaveAttribute("data-path", "/");
  });
});
