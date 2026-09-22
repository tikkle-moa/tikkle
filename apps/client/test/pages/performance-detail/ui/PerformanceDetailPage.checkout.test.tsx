import { MemoryRouter, useLocation } from "react-router";

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { VenueSeatHoldDetail } from "@tikkle/api-types";

import PerformanceDetailPage from "@pages/performance-detail/ui/PerformanceDetailPage";

const { mockUsePerformanceDetail, mockGetPerformanceCheckoutNavigation } = vi.hoisted(() => ({
  mockUsePerformanceDetail: vi.fn(),
  mockGetPerformanceCheckoutNavigation: vi.fn(),
}));

const checkoutHold: VenueSeatHoldDetail = {
  holdId: "hold-1",
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
}));

vi.mock("@pages/performance-detail/ui/PerformanceSeatMap", () => ({
  default: ({ onCheckout }: { onCheckout?: (hold: VenueSeatHoldDetail) => void }) => (
    <button type="button" onClick={() => onCheckout?.(checkoutHold)}>
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
    mockGetPerformanceCheckoutNavigation.mockReturnValue({ pathname: "/performances/1/checkout", state: { hold: checkoutHold } });
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
    expect(screen.getByTestId("location-path")).toHaveTextContent('"holdId":"hold-1"');
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
