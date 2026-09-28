import { MemoryRouter } from "react-router";

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { BeginCheckoutReviewMessageData } from "@tikkle/api-types";

import PerformanceDetailPage from "@pages/performance-detail/ui/PerformanceDetailPage";

const { mockUsePerformanceDetail, mockHandleCheckout } = vi.hoisted(() => ({
  mockUsePerformanceDetail: vi.fn(),
  mockHandleCheckout: vi.fn(),
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

vi.mock("@pages/performance-detail/ui/PerformanceSeatMap", () => ({
  default: ({ onCheckout }: { onCheckout?: (review: BeginCheckoutReviewMessageData) => void }) => (
    <button type="button" onClick={() => onCheckout?.(checkoutReview)}>
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
  handleCheckout: mockHandleCheckout,
};

describe("PerformanceDetailPage checkout callback", () => {
  beforeEach(() => {
    mockUsePerformanceDetail.mockReset();
    mockUsePerformanceDetail.mockReturnValue(pageState);
  });

  it("점유한 좌석의 예매 정보 확인 callback을 페이지 훅에 전달한다", async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <PerformanceDetailPage />
      </MemoryRouter>,
    );

    await user.click(screen.getByRole("button", { name: "예매 정보 확인 테스트" }));

    expect(mockHandleCheckout).toHaveBeenCalledWith(checkoutReview);
  });
});
