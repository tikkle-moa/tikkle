import { render, screen } from "@testing-library/react";

import { VenueDetailPage } from "@pages/venue-detail";
import { VENUE_DETAIL_MESSAGES } from "@pages/venue-detail/model/venue-detail.constants";

const { mockUseVenueDetail } = vi.hoisted(() => ({
  mockUseVenueDetail: vi.fn(),
}));

vi.mock("@pages/venue-detail/model/use-venue-detail", () => ({
  useVenueDetail: mockUseVenueDetail,
}));

vi.mock("@features/venue-map", () => ({
  VenueMap: ({ venue, venueSeats }: { venue: { name: string }; venueSeats: unknown[] }) => (
    <div data-testid="venue-map">
      {venue.name} · {venueSeats.length}석
    </div>
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

const venueSeats = [
  {
    id: 1,
    venueId: 1,
    sectionName: "A구역",
    seatNumber: 1,
    seatLabel: "A구역 1열 1번",
    price: 150000,
    positionX: 20,
    positionY: 28,
    createdAt: "2026-08-25T12:00:00",
  },
];

describe("VenueDetailPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockUseVenueDetail.mockReturnValue({
      isParamValid: true,
      venue,
      venueSeats,
      isPending: false,
      isError: false,
    });
  });

  it("공연장 메타데이터와 좌석 배치도를 표시한다", () => {
    render(<VenueDetailPage />);

    expect(screen.getByRole("heading", { name: venue.name })).toBeInTheDocument();
    expect(screen.getByText(venue.address)).toBeInTheDocument();
    expect(screen.getByText(venue.description)).toBeInTheDocument();
    expect(screen.getByTestId("venue-map")).toHaveTextContent("올림픽공원 KSPO DOME · 1석");
  });

  it("공연장 설명이 없으면 설명 영역을 표시하지 않는다", () => {
    mockUseVenueDetail.mockReturnValue({
      isParamValid: true,
      venue: { ...venue, description: null },
      venueSeats,
      isPending: false,
      isError: false,
    });

    render(<VenueDetailPage />);

    expect(screen.queryByText("가상 공연장 좌석 배치도입니다.")).not.toBeInTheDocument();
  });

  it("잘못된 ID 상태를 표시한다", () => {
    mockUseVenueDetail.mockReturnValue({
      isParamValid: false,
      venue: undefined,
      venueSeats: [],
      isPending: false,
      isError: false,
    });

    render(<VenueDetailPage />);

    expect(screen.getByRole("heading", { name: VENUE_DETAIL_MESSAGES.invalid.title })).toBeInTheDocument();
    expect(screen.getByText(VENUE_DETAIL_MESSAGES.invalid.description)).toBeInTheDocument();
  });

  it("로딩 상태에서 skeleton을 표시한다", () => {
    mockUseVenueDetail.mockReturnValue({
      isParamValid: true,
      venue: undefined,
      venueSeats: [],
      isPending: true,
      isError: false,
    });

    render(<VenueDetailPage />);

    expect(screen.getByLabelText("공연장 상세 정보를 불러오는 중")).toHaveAttribute("aria-busy", "true");
  });

  it("오류 상태를 표시한다", () => {
    mockUseVenueDetail.mockReturnValue({
      isParamValid: true,
      venue: undefined,
      venueSeats: [],
      isPending: false,
      isError: true,
    });

    render(<VenueDetailPage />);

    expect(screen.getByRole("heading", { name: VENUE_DETAIL_MESSAGES.error.title })).toBeInTheDocument();
    expect(screen.getByText(VENUE_DETAIL_MESSAGES.error.description)).toBeInTheDocument();
  });
});
